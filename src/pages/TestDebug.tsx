import React from 'react';

export default function TestDebug() {
  return (
    <div style={{ padding: '20px', background: 'white', color: 'black' }}>
      <h1>Debug Test Page</h1>
      <p>This page should work if there are no import issues.</p>
      <button onClick={() => alert('Button works!')}>
        Test Button
      </button>
      
      <div>
        <h2>Check console for errors</h2>
        <p>Open DevTools (F12) and check the Console tab for any JavaScript errors.</p>
      </div>
    </div>
  );
}