import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './SingleChat.css'

import React, { useState, useEffect, useRef } from 'react';

import { getWindowAI } from 'window.ai';

const SingleChat = () => {
    const [state, setState] = useState({
        roomChatMessageHistory: [],
        isChatting: false
    });

    const [chatProcessing, setChatProcessing] = useState(false);

    const [messageHistory, setMessageHistory] = useState([]);

    const [actionHistory, setActionHistory] = useState([]);
    const [scrollRequestQueue, setScrollRequestQueue] = useState([]);

    const messageInput = useRef(null);
    const chatMessagesEnd = useRef(null);
    const roomChatMessagesEnd = useRef(null);
    const chatMessagesEndRef = useRef(null);

    async function getChatResponseStream(
        messages,
    ) {
        console.log('getChatResponseStream');

        console.log('messages');
        console.log(messages);

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    let ai;
                    try {
                        ai = await getWindowAI()
                    } catch (error) {
                        alert('window.ai not found. Please install at https://windowai.io/');
                        return;
                    }

                    const response = await ai.generateText(
                        {
                            messages: messages
                        },
                        {
                            temperature: 0.7,
                            maxTokens: 300,
                            // Handle partial results if they can be streamed in
                            onStreamResult: (res) => {
                                console.log(res.message.content)

                                controller.enqueue(res.message.content);
                            }
                        }
                    );

                    console.log('response');
                    console.log(response);
                } catch (error) {
                    controller.error(error);
                } finally {
                    controller.close();
                }
            },
        });

        return stream;
    }


    const formSendMessage = async () => {
        if (chatProcessing) {
            return;
        }

        const message = messageInput.current.value;
        if (message.length > 0) {
            // alert(message);
            // sendMessage(message);
            messageInput.current.value = '';
        }

        let messages = [
            ...messageHistory,
            {
                content: message,
                role: "user"
            }
        ]

        console.log('messageHistory before', messageHistory);

        setMessageHistory(messages);
        setChatProcessing(true);

        const systemMessage = {
            content: "You are a 3D avatar in a virtual world. The user is another avatar in the same world.",
            role: "system"
        }

        const inputMessages = [
            systemMessage,
            ...messages,
        ];

        console.log('inputMessages', inputMessages);

        const stream = await getChatResponseStream(inputMessages).catch(
            (e) => {
                console.error(e);
                return null;
            }
        );
        if (stream == null) {
            setChatProcessing(false);
            return;
        }

        let history = [
            ...messages,
            {
                content: "",
                role: "assistant"
            }
        ]

        const index = history.length - 1;

        const reader = stream.getReader();
        let receivedMessage = "";
        let aiTextLog = "";
        let tag = "";
        const sentences = [];
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                receivedMessage += value;

                console.log('receivedMessage');
                console.log(receivedMessage);

                history[index].content = receivedMessage;

                console.log('history', history);

                // clone array for react to detect change
                history = [...history];

                setMessageHistory(history);
            }
        } catch (e) {
            setChatProcessing(false);
            console.error(e);
        } finally {
            reader.releaseLock();
        }

        setMessageHistory(history);
        setChatProcessing(false);
    };

    useEffect(() => {
        console.log('app mounted');
        // document.getElementById('new_messages_button_container').style.display = 'none';
    }, []);

    const scrollToBottom = () => {
        chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messageHistory]);

    // <div ref={chatMessagesEndRef}></div>

    return (
        <>
            <div id="chat_area">
                <div id="chat_message_box">
                    {messageHistory.map((message, index) => (
                        index >= 0 && (
                            <div key={index} className={message.role === 'user' ? 'user_message' : 'assistant_message'}>
                                <div className="message_span">
                                    {message.content}
                                </div>
                            </div>
                        )
                    ))}
                    <div ref={chatMessagesEndRef}></div>
                </div>
                <div className="input-group">
                    <input
                        type="text"
                        className="form-control chat-input"
                        placeholder="Message"
                        aria-label="Message"
                        aria-describedby="button-addon2"
                        ref={messageInput}
                        onKeyUp={(e) => {
                            if (e.key === 'Enter') {
                                formSendMessage();
                            }
                        }}
                    />
                    <button
                        className="btn btn-outline-secondary chat-send-button"
                        type="button"
                        id="button-addon2"
                        onClick={formSendMessage}
                        disabled={chatProcessing}
                    >
                        Send
                    </button>
                </div>
            </div>
        </>
    );
};

export default SingleChat;
