import { useState } from "react";

interface SettingsProps {
  username: string;
  setUsername: (username: string) => void;
}

const Settings: React.FC<SettingsProps> = (
  {
    username,
    setUsername
  }
) => {
  const [usernameInputText, setUsernameInputText] = useState(username);
  const [showSavedAlert, setShowSavedAlert] = useState(false); // New state variable

  const handleSaveClick = (event: React.FormEvent) => {
    event.preventDefault();
    setUsername(usernameInputText);
    setShowSavedAlert(true); // Show the saved alert
    // Close the modal or perform any other desired actions
  };

  const handleUsernameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUsernameInputText(event.target.value);
    setShowSavedAlert(false); // Hide the saved alert
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // don't propagate event to prevent interference with FPS controls
    event.stopPropagation();
  };

  return (
    <>
      <div className="modal fade" id="settingsModal" tabIndex={-1}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h1 className="modal-title fs-5" id="exampleModalLabel">Settings</h1>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body text-start">
              <form onSubmit={handleSaveClick}>
                <div className="mb-3">
                  <label htmlFor="exampleInputUsername" className="form-label">Username</label>
                  <input type="text" className="form-control" id="exampleInputUsername" value={usernameInputText} onChange={handleUsernameChange} onKeyDown={handleKeyDown} />
                </div>
                <button type="submit" className="btn btn-primary">Save</button>
              </form>
              {showSavedAlert && (
                <div className="alert alert-success mt-3" role="alert">
                  Username saved
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Settings;