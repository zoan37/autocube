import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './Chat.css'

import React, { useState, useEffect, useRef } from 'react';

const Chat = () => {
    const [state, setState] = useState({
        messageHistory: [],
        roomChatMessageHistory: [],
        isChatting: false
    });

    const [actionHistory, setActionHistory] = useState([]);
    const [scrollRequestQueue, setScrollRequestQueue] = useState([]);

    const messageInput = useRef(null);
    const chatMessagesEnd = useRef(null);
    const roomChatMessagesEnd = useRef(null);

    useEffect(() => {
        if (state.isChatting) {
            setTimeout(() => {
                messageInput.current.focus();
            }, 10);
        }
    }, [state.isChatting]);

    const scrollInterval = setInterval(() => {
        if (scrollRequestQueue.length > 0) {
            scrollToBottom();
            setScrollRequestQueue(scrollRequestQueue.slice(1));
        }
    }, 500);

    const scrollToBottom = () => {
        chatMessagesEnd.current.scrollIntoView({
            behavior: "smooth"
        });
    };

    const roomChatScrollToBottom = () => {
        roomChatMessagesEnd.current.scrollIntoView({
            behavior: "smooth"
        });
    };

    const roomChatInstantScrollToBottom = () => {
        roomChatMessagesEnd.current.scrollIntoView({
            behavior: "instant"
        });
    };

    window.sendMessage = async (message) => {
        // Assuming that you have the necessary implementations for stripResponse, parseResponse
        // and window.ai.getCompletion or equivalent functions.

        const newMessageHistory = [...state.messageHistory, message];
        setState({ ...state, messageHistory: newMessageHistory });

        try {
            // This part assumes you have a window.ai.getCompletion or an equivalent async function
            const response = await window.ai.getCompletion({
                messages: newMessageHistory
            });
            // Handle response (Push to messageHistory, actionHistory, etc.)
        } catch (e) {
            alert("Error: " + e);
            console.error(e);
        }
    };

    window.receiveChatMessage = (message) => {
        console.log('received message:', message);

        message.receivedTimestamp = Date.now();

        const newRoomChatMessageHistory = [...state.roomChatMessageHistory, message];
        setState({ ...state, roomChatMessageHistory: newRoomChatMessageHistory });

        if (message.isUserSender) {
            setTimeout(() => {
                roomChatScrollToBottom();
            }, 10);
        }

        const container = document.getElementById('room_chat_message_box');
        if (container.scrollTop + container.clientHeight >= container.scrollHeight) {
            setTimeout(() => {
                roomChatScrollToBottom();
                // document.getElementById('new_messages_button_container').style.display = 'none';
            }, 10);
        }
    };

    useEffect(() => {
        console.log('app mounted');
        // document.getElementById('new_messages_button_container').style.display = 'none';
    }, []);

    return (
        <>
            <div>
                Yooooo
            </div>
            <div id="interface_container">
                <div id="room_chat_area">
                    <div id="room_chat_message_box">
                        {state.roomChatMessageHistory.map((message, index) => (
                            <div className={message.isUserSender ? 'user_message' : 'assistant_message'} key={index}>
                                <div className="message_span">
                                    {message.message}
                                </div>
                            </div>
                        ))}
                        <div ref={roomChatMessagesEnd}></div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Chat;
