# frozen_string_literal: true

require 'open3'
require 'tmpdir'
require 'yaml'

def workflow(name)
  YAML.safe_load(File.read(File.join(__dir__, '..', 'workflows', "#{name}.yml")))
end

def check(message, condition)
  raise message unless condition
end

def input_values(event, supplied = {})
  event.fetch('inputs').each_with_object({}) do |(name, spec), values|
    value = supplied.fetch(name) { spec.fetch('default', '') }
    if spec['type'] == 'choice'
      check("Invalid selection for #{name}: #{value}", spec.fetch('options').include?(value))
    end
    values[name] = value
  end
end

def trigger(workflow, event)
  # Psych's YAML 1.1 resolver interprets an unquoted "on" as true.
  workflow.fetch(workflow.key?('on') ? 'on' : true).fetch(event)
end

def resolve_input(expression, inputs)
  reference = /^\$\{\{ inputs\.(\w+)(?: \|\| '([^']*)')? \}\}$/.match(expression)
  return expression unless reference

  value = inputs.fetch(reference[1])
  value.empty? ? (reference[2] || '') : value
end

# Interpret the step conditions used by these workflows. Fail if a new
# condition needs test support instead of silently executing a gated step.
def step_enabled?(step, env, installed: false)
  expression = step['if']
  return true unless expression
  return installed if expression == "always() && steps.install.outcome == 'success'"

  condition = /^env\.(\w+) == '([^']+)'$/.match(expression)
  check("Unsupported deployment step condition: #{expression}", condition)
  env.fetch(condition[1]) == condition[2]
end

def run_step(step, env, installed: false, context: {})
  return unless step_enabled?(step, env, installed: installed)

  step_env = step.fetch('env', {}).transform_values do |value|
    reference = /^\$\{\{ (steps\.[\w.-]+) \}\}$/.match(value)
    reference ? context.fetch(reference[1]) : value
  end
  Open3.capture3(env.merge(step_env), 'bash', '-c', step.fetch('run'), unsetenv_others: true)
end

def exercise(job, inputs, expected_flags, state: 'PENDING_REVIEW', reject: false, invalid: nil, expected_exit: 0)
  Dir.mktmpdir('chrome-deploy-test') do |tmp|
    env = job.fetch('env').transform_values { |value| resolve_input(value, inputs) }
    env.merge!(
      'PATH' => "#{tmp}:#{ENV.fetch('PATH')}",
      'CHROME_APP_ID' => 'test-item',
      'RUNNER_TEMP' => tmp,
      'GITHUB_STEP_SUMMARY' => File.join(tmp, 'summary'),
      'STUB_CALLS' => File.join(tmp, 'calls'),
      'GITHUB_OUTPUT' => File.join(tmp, 'outputs'),
      'STUB_PUBLISH_STATE' => state || '',
      'REJECT_SUBMISSION' => reject ? 'yes' : 'no'
    )
    context = {
      'steps.release.outputs.asset' => 'test.zip',
      'steps.release.outputs.version' => '1.2.3',
      'steps.release.outputs.tag' => 'v1.2.3'
    }
    stub = File.join(tmp, 'go-webext')
    File.write(stub, <<~'SH')
      #!/usr/bin/env bash
      set -euo pipefail
      printf '%s\n' "$*" >> "$STUB_CALLS"
      case "$1" in
        update) printf '%s\n' 'Upload State: SUCCEEDED' 'Version: 1.2.3' ;;
        publish)
          if [[ -n "$STUB_PUBLISH_STATE" ]]; then printf 'State: %s\n' "$STUB_PUBLISH_STATE"; fi
          [[ "$REJECT_SUBMISSION" != yes ]] || exit 42
          ;;
        status) printf '%s\n' 'Published Version: 1.2.2' ;;
        *) exit 1 ;;
      esac
    SH
    File.chmod(0o700, stub)

    steps = job.fetch('steps')
    upload_step = steps.find { |step| step['id'] == 'upload' }
    guard = steps.find { |step| step['id'] == 'check-inputs' }
    submit_step = steps.find { |step| step['id'] == 'submit' }
    status_step = steps.find { |step| step['name'] == 'Report store status' }
    validation_step = steps.find { |step| step['name'] == 'Report validation' }
    release_step = steps.find { |step| step['id'] == 'release' }
    ordered_steps = [guard, release_step, upload_step, submit_step, status_step]
    expected_order = steps.select { |step| ordered_steps.include?(step) }
    check('Check inputs, verify the release, upload, submit and report in that order', expected_order == ordered_steps)
    check('Chrome job must fail if submission fails', [job, guard, release_step, upload_step, submit_step].none? { |item| item['continue-on-error'] })

    _, stderr, guard_status = run_step(guard, env)
    if invalid
      check('Unexpected input must fail before upload', !guard_status.success? && stderr.include?(invalid))
      check('Unexpected input must make no CLI calls', !File.exist?(env.fetch('STUB_CALLS')))
      next
    end
    check("Release input check failed: #{stderr}", guard_status.success?)
    check('Release verification must run in both modes', step_enabled?(release_step, env))
    fixture_tag = inputs.merge('tag' => 'v1.2.3')
    check('Release verification must receive the supplied tag', resolve_input(release_step.fetch('env').fetch('INPUT_TAG'), fixture_tag) == 'v1.2.3')
    upload = run_step(upload_step, env, context: context)
    submit = run_step(submit_step, env)

    unless expected_flags
      check('Validation must skip store tooling and its calls', !upload && !submit && !File.exist?(env.fetch('STUB_CALLS')))
      tooling = steps.select { |step| step['id'] == 'install' || step['uses']&.start_with?('actions/setup-go@') }
      check('Validation must guard both Go tooling steps', tooling.length == 2 && tooling.none? { |step| step_enabled?(step, env) })
      check('Validation must skip the status lookup', !step_enabled?(status_step, env))
      check('Validation must report the result', run_step(validation_step, env, context: context).last.success?)
      next
    end

    check('Submit mode must skip the validation summary', !step_enabled?(validation_step, env))
    check('Fixture upload should succeed', upload.last.success?)
    check("Unexpected publish exit for #{state.inspect}: #{submit.last.exitstatus}", submit.last.exitstatus == expected_exit)
    output = env.fetch('GITHUB_OUTPUT')
    state_output = File.exist?(output) ? File.readlines(output, chomp: true) : []
    check('Only an accepted API state may be exposed as success', state_output == (expected_exit.zero? ? ["state=#{state}"] : []))
    context['steps.submit.outputs.state'] = state_output.first.to_s.delete_prefix('state=')
    context['steps.submit.outcome'] = submit.last.success? ? 'success' : 'failure'
    context['steps.upload.outcome'] = upload.last.success? ? 'success' : 'failure'
    _, stderr, report_status = run_step(status_step, env, installed: true, context: context)
    check("Submission must write a status report: #{stderr}", report_status.success?)
    calls = File.readlines(env.fetch('STUB_CALLS'), chomp: true)
    check('Wrong store CLI calls or rollout policy', calls == [
      'update chrome -a test-item -f store-upload/test.zip',
      "publish chrome -a test-item #{expected_flags}",
      'status chrome -a test-item'
    ])
    summary = File.read(env.fetch('GITHUB_STEP_SUMMARY'))
    check('Report must identify the submitted release', summary.include?('`v1.2.3` (version 1.2.3)'))
    if !expected_exit.zero?
      check('Report must show the failed submission step', summary.include?('Upload step `success`, submission step `failure`'))
      check('Rejected submission must be reported as unconfirmed', summary.include?('review was not confirmed'))
      check('Rejected submission must omit the success message', !summary.include?('Submitted for review'))
    elsif state == 'STAGED'
      check('Already staged version must report the manual step', summary.include?('version is staged') && summary.include?('Developer Dashboard within 30 days'))
    elsif state == 'PUBLISHED'
      check('Published version must report the API result', summary.include?('version is published') && !summary.include?('pending review'))
    else
      check('Accepted submission must report pending public availability', summary.include?('Public availability is not confirmed'))
      if expected_flags == '--staged'
        check('Staged submission must report the manual step', summary.include?('Developer Dashboard within 30 days'))
      else
        check('Automatic submission must report the rollout after review', summary.include?('100% after Google approval'))
      end
    end
  end
end

# Evaluate only the job conditions exercised here. Bash receives a boolean
# expression containing digits and operators, never the workflow's raw input.
def job_enabled?(job, inputs, results, cancelled: false)
  condition = job.fetch('if').strip.sub(/\A\$\{\{\s*/, '').sub(/\s*\}\}\z/, '')
  condition = condition.gsub(/inputs\.(\w+) == '([^']+)'/) do
    inputs.fetch(Regexp.last_match(1)) == Regexp.last_match(2) ? '1' : '0'
  end
  condition = condition.gsub(/needs\.([\w-]+)\.result == '([^']+)'/) do
    results.fetch(Regexp.last_match(1)) == Regexp.last_match(2) ? '1' : '0'
  end
  condition = condition.gsub('always()', '1').gsub('cancelled()', cancelled ? '1' : '0')
  check('Unsupported combined workflow job condition', condition.match?(/\A[01()!&|\s]+\z/))
  _, stderr, status = Open3.capture3('bash', '-c', "((#{condition}))")
  check("Invalid combined workflow job condition: #{stderr}", stderr.empty? && [0, 1].include?(status.exitstatus))
  status.success?
end

def check_aggregate_jobs(jobs, dispatch)
  submit = jobs.fetch('submit-chrome')
  validate = jobs.fetch('validate-chrome')
  success = 'success'
  results = { 'release' => success, 'validate-chrome' => success, 'validate-edge' => success, 'validate-firefox' => success }
  check('Chrome submission must wait for release selection and validation', (results.keys - submit.fetch('needs')).empty?)

  %w[all chrome edge firefox].each do |target|
    chrome_selected = %w[all chrome].include?(target)
    validation = input_values(dispatch, 'target' => target)
    submission = input_values(dispatch, 'target' => target, 'mode' => 'submit')
    outcomes = results.merge('validate-chrome' => chrome_selected ? success : 'skipped')
    outcomes['validate-edge'] = 'skipped' unless %w[all edge].include?(target)
    outcomes['validate-firefox'] = 'skipped' unless %w[all firefox].include?(target)

    check("Wrong Chrome validation selection for target #{target}", job_enabled?(validate, validation, {}) == chrome_selected)
    check("Validate mode enabled Chrome submission for target #{target}", !job_enabled?(submit, validation, outcomes))
    check("Wrong Chrome submission selection for target #{target}", job_enabled?(submit, submission, outcomes) == chrome_selected)
    next unless chrome_selected

    outcomes.select { |_, result| result == success }.each_key do |prerequisite|
      check("Chrome submission ran after #{prerequisite} failed for #{target}", !job_enabled?(submit, submission, outcomes.merge(prerequisite => 'failure')))
    end
    check("Chrome submission ran after cancellation for #{target}", !job_enabled?(submit, submission, outcomes, cancelled: true))
  end
end

def exercise_caller(caller, inputs, expected_flags)
  called_workflow = workflow(File.basename(caller.fetch('uses'), '.yml'))
  release_tag = 'v1.2.3'
  provided = caller.fetch('with').transform_values do |value|
    value == '${{ needs.release.outputs.tag }}' ? release_tag : resolve_input(value, inputs)
  end
  check('The caller must pass the selected release tag to Chrome', provided.fetch('tag') == release_tag)
  exercise(
    called_workflow.fetch('jobs').fetch('deploy'),
    input_values(trigger(called_workflow, 'workflow_call'), provided),
    expected_flags
  )
end

chrome = workflow('deploy-chrome-store')
job = chrome.fetch('jobs').fetch('deploy')
dispatch = trigger(chrome, 'workflow_dispatch')
direct = input_values(dispatch)
exercise(job, direct, '--percentage 100')
exercise(job, input_values(dispatch, 'publish_policy' => 'staged'), '--staged')
exercise(job, input_values(dispatch, 'mode' => 'validate'), nil)
exercise(job, direct, '--percentage 100', reject: true, expected_exit: 42)
exercise(job, direct, '--percentage 100', state: 'PUBLISHED')
exercise(job, input_values(dispatch, 'publish_policy' => 'staged'), '--staged', state: 'STAGED')
['REJECTED', 'CANCELLED', 'PUBLISHED_TO_TESTERS', 'STAGED', 'ITEM_STATE_UNSPECIFIED', 'FUTURE_STATE', nil].each do |state|
  exercise(job, direct, '--percentage 100', state: state, expected_exit: 1)
end
exercise(job, input_values(dispatch, 'publish_policy' => 'staged'), '--staged', state: 'PUBLISHED', expected_exit: 1)

reusable = trigger(chrome, 'workflow_call')
exercise(job, input_values(reusable, 'mode' => 'submit'), '--percentage 100')
exercise(job, input_values(reusable, 'mode' => 'submit', 'publish_policy' => 'invalid-choice'), nil, invalid: 'invalid-choice')
exercise(job, input_values(reusable, 'mode' => 'invalid-mode'), nil, invalid: 'invalid-mode')

aggregate = workflow('deploy-stores')
aggregate_dispatch = trigger(aggregate, 'workflow_dispatch')
aggregate_jobs = aggregate.fetch('jobs')
check('Combined workflow must default to validation', input_values(aggregate_dispatch).fetch('mode') == 'validate')
check_aggregate_jobs(aggregate_jobs, aggregate_dispatch)

%w[chrome all].each do |target|
  submit_inputs = { 'target' => target, 'mode' => 'submit' }
  exercise_caller(
    aggregate_jobs.fetch('submit-chrome'),
    input_values(aggregate_dispatch, submit_inputs),
    '--percentage 100'
  )
  exercise_caller(
    aggregate_jobs.fetch('submit-chrome'),
    input_values(aggregate_dispatch, submit_inputs.merge('chrome_publish_policy' => 'staged')),
    '--staged'
  )
end
exercise_caller(aggregate_jobs.fetch('validate-chrome'), input_values(aggregate_dispatch), nil)
puts 'Chrome deployment workflow checks passed.'
