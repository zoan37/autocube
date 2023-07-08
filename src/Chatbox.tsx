import React, { useEffect, useRef, useState } from 'react';
import './Chatbox.css';

interface ChatMessage {
    text: string;
    timestamp: Date;
    username: string;
}

interface ChatboxProps {
    username: string;
}

const Chatbox: React.FC<ChatboxProps> = (
    {
        username
    }
) => {
    const [message, setMessage] = useState('');
    const [chatMessages, setChatMessages] = useState([] as ChatMessage[]);
    const chatboxEndRef = useRef<HTMLDivElement>(null);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setMessage(event.target.value);
    };

    const handleSendClick = () => {
        sendMessage();
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
        // don't propagate event to prevent interference with FPS controls
        event.stopPropagation();
    };

    const sendMessage = () => {
        if (message.trim() !== '') {
            const newMessage: ChatMessage = {
                text: message,
                timestamp: new Date(),
                username: username,
            };
            // create new array with previous messages and new message
            const newChatMessages = [...chatMessages, newMessage] as ChatMessage[];

            setChatMessages(newChatMessages);
            setMessage('');
            scrollToBottom();
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatMessages]);

    function scrollToBottom() {
        if (chatboxEndRef.current) {
            chatboxEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }

    return (
        <>
            <div className="chatbox_container mb-2">
                <div className="chatbox_text_container">
                    {chatMessages.map((chat, index) => (
                        <div key={index}>
                            <span><b>{chat.username}:</b>&nbsp;</span>
                            <span>{chat.text}</span>
                        </div>
                    ))}
                    <div ref={chatboxEndRef}></div>
                </div>
                <div>
                    <div className="input-group">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Message"
                            value={message}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                        />
                        <button
                            className="btn btn-outline-secondary"
                            type="button"
                            id="button-addon2"
                            onClick={handleSendClick}
                        >
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Chatbox;
