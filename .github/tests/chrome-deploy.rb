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

def run_step(step, env, installed: false)
  return unless step_enabled?(step, env, installed: installed)

  Open3.capture3(env, 'bash', '-c', step.fetch('run'))
end

def exercise(job, inputs, expected_flags, reject: false, invalid: false)
  Dir.mktmpdir('chrome-deploy-test') do |tmp|
    env = job.fetch('env').transform_values { |value| resolve_input(value, inputs) }
    env.merge!(
      'PATH' => "#{tmp}:#{ENV.fetch('PATH')}",
      'CHROME_APP_ID' => 'test-item',
      'ASSET' => 'test.zip',
      'VERSION' => '1.2.3',
      'RELEASE_TAG' => 'v1.2.3',
      'RUNNER_TEMP' => tmp,
      'GITHUB_STEP_SUMMARY' => File.join(tmp, 'summary'),
      'STUB_CALLS' => File.join(tmp, 'calls'),
      'REJECT_SUBMISSION' => reject ? 'yes' : 'no',
      'UPLOAD_OUTCOME' => 'success'
    )
    stub = File.join(tmp, 'go-webext')
    File.write(stub, <<~'SH')
      #!/usr/bin/env bash
      set -euo pipefail
      printf '%s\n' "$*" >> "$STUB_CALLS"
      case "$1" in
        update) printf '%s\n' 'Upload State: SUCCEEDED' 'Version: 1.2.3' ;;
        publish) [[ "$REJECT_SUBMISSION" != yes ]] || exit 42 ;;
        status) printf '%s\n' 'Published Version: 1.2.2' ;;
        *) exit 1 ;;
      esac
    SH
    File.chmod(0o700, stub)

    steps = job.fetch('steps')
    upload_step = steps.find { |step| step['id'] == 'upload' }
    guard = steps.find { |step| step['id'] == 'check-inputs' }
    check('Release inputs must be checked before upload', guard && steps.index(guard) < steps.index(upload_step))
    _, stderr, guard_status = run_step(guard, env)
    if invalid
      check('Unexpected policy must fail before upload', !guard_status.success? && stderr.include?('invalid-choice'))
      check('Unexpected policy must make no CLI calls', !File.exist?(env.fetch('STUB_CALLS')))
      next
    end
    check("Release input check failed: #{stderr}", guard_status.success?)

    submit_step = steps.find { |step| step['id'] == 'submit' }
    status_step = steps.find { |step| step['name'] == 'Report store status' }
    validation_step = steps.find { |step| step['name'] == 'Report validation' }
    upload = run_step(upload_step, env)
    submit = run_step(submit_step, env)

    unless expected_flags
      check('Validation must skip store tooling and its calls', !upload && !submit && !File.exist?(env.fetch('STUB_CALLS')))
      tooling = steps.select { |step| step['id'] == 'install' || step['uses']&.start_with?('actions/setup-go@') }
      check('Validation must guard both Go tooling steps', tooling.length == 2 && tooling.none? { |step| step_enabled?(step, env) })
      check('Validation must skip the status lookup', !step_enabled?(status_step, env))
      check('Validation must report the result', run_step(validation_step, env).last.success?)
      next
    end

    check('Fixture upload should succeed', upload.last.success?)
    check('Publish must propagate the CLI result', submit.last.exitstatus == (reject ? 42 : 0))
    env['SUBMIT_OUTCOME'] = submit.last.success? ? 'success' : 'failure'
    check('Submission must write a status report', run_step(status_step, env, installed: true).last.success?)
    calls = File.readlines(env.fetch('STUB_CALLS'), chomp: true)
    check('Wrong store CLI calls or rollout policy', calls == [
      'update chrome -a test-item -f store-upload/test.zip',
      "publish chrome -a test-item #{expected_flags}",
      'status chrome -a test-item'
    ])
    summary = File.read(env.fetch('GITHUB_STEP_SUMMARY'))
    if reject
      check('Rejected submission must be reported as unconfirmed', summary.include?('review was not confirmed'))
      check('Rejected submission must omit the success message', !summary.include?('Submitted for review'))
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

def exercise_caller(caller, inputs, expected_flags)
  called_workflow = workflow(File.basename(caller.fetch('uses'), '.yml'))
  provided = caller.fetch('with').transform_values { |value| resolve_input(value, inputs) }
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
exercise(job, direct, '--percentage 100', reject: true)

reusable = trigger(chrome, 'workflow_call')
exercise(job, input_values(reusable, 'mode' => 'submit'), '--percentage 100')
exercise(job, input_values(reusable, 'mode' => 'submit', 'publish_policy' => 'invalid-choice'), nil, invalid: true)

aggregate = workflow('deploy-stores')
aggregate_dispatch = trigger(aggregate, 'workflow_dispatch')
aggregate_jobs = aggregate.fetch('jobs')
check('Combined workflow must default to validation', input_values(aggregate_dispatch).fetch('mode') == 'validate')

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
