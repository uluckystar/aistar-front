import React, { useState } from 'react';
import ChatComponent from './ChatComponent';
import LoginComponent from './LoginComponent';

const App = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));

    const handleLogin = (status) => {
        setIsLoggedIn(status);
    };

    return (
        <div>
            {isLoggedIn ? <ChatComponent /> : <LoginComponent onLogin={handleLogin} />}
        </div>
    );
};

export default App;
