import browser from 'webextension-polyfill';

import { Logger } from '../utils/logger';

import { Message, MessageType } from './message-types';

/**
 * Callback type for message handlers
 * Handlers can return void, a value, or a Promise of either
 */
export type MessageHandler<T extends Message = Message, R = any> = (
    message: T,
) => void | R | Promise<void | R>;

/**
 * Service for dispatching messages from UI pages to registered handlers
 */
export class MessageDispatcherService {
    private handlers = new Map<MessageType, MessageHandler>();

    /**
     * Registers a handler for a specific message type
     * @param messageType The type of message to handle
     * @param handler The handler function
     */
    on<T extends Message, R = any>(messageType: T['type'], handler: MessageHandler<T, R>): void {
        this.handlers.set(messageType, handler as MessageHandler);
    }

    /**
     * Initializes the message listener
     * Should be called once during background script initialization
     */
    init(): void {
        browser.runtime.onMessage.addListener(
            (message: Message, _sender, sendResponse: (response?: any) => void): true | undefined => {
                const handler = this.handlers.get(message.type);
                if (!handler) {
                    return undefined;
                }

                // Execute handler and handle potential async nature
                const result = handler(message);
                if (result instanceof Promise) {
                    // For async handlers, wait for the result and send response
                    result
                        .then((value) => {
                            sendResponse(value);
                        })
                        .catch((error) => {
                            Logger.error(`Error handling message ${message.type}:`, error);
                            sendResponse({ error: error.message });
                        });
                    // Return true to indicate we will send a response asynchronously
                    return true;
                }
                // For sync handlers, send response immediately
                sendResponse(result);
                return undefined;
            },
        );
    }
}
