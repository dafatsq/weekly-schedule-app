import React, { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import './WeeklySchedule.css';
import { auth } from './firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged} from 'firebase/auth';
import { db } from './firebase';
import {
  doc,
  getDoc,
  setDoc
} from 'firebase/firestore';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const allHours = [
  '00:00-01:00', '01:00-02:00', '02:00-03:00', '03:00-04:00', '04:00-05:00',
  '05:00-06:00', '06:00-07:00', '07:00-08:00', '08:00-09:00', '09:00-10:00',
  '10:00-11:00', '11:00-12:00', '12:00-13:00', '13:00-14:00', '14:00-15:00',
  '15:00-16:00', '16:00-17:00', '17:00-18:00', '18:00-19:00', '19:00-20:00',
  '20:00-21:00', '21:00-22:00', '22:00-23:00', '23:00-00:00'
];

function WeeklySchedule() {
  const [startTime, setStartTime] = useState('03:00-04:00'); 
  const [endTime, setEndTime] = useState('21:00-22:00');
  const [tempStartTime, setTempStartTime] = useState(startTime); 
  const [tempEndTime, setTempEndTime] = useState(endTime);  
  const [hours, setHours] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({ content: '', day: 'Monday', hour: '10:00-11:00', duration: 1 });
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [editText, setEditText] = useState('');
  const [editDuration, setEditDuration] = useState(1);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState('');
  const [chartError, setChartError] = useState('');
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode === 'true';
  });
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // New state variables for profile picture upload
  const [showProfileUploadModal, setShowProfileUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    const checkUserStatus = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        loadTasks(currentUser.uid);
        loadProfilePicture(currentUser.uid, currentUser.email);
      }
    });
    
    return () => checkUserStatus();
  }, []);

  useEffect(() => {
    const startIndex = allHours.findIndex(hour => hour === startTime);
    const endIndex = allHours.findIndex(hour => hour === endTime);
    const visibleHours = allHours.slice(startIndex, endIndex + 1);
    setHours(visibleHours);
  }, [startTime, endTime]);

  useEffect(() => {
    if (selectedTaskId) {
      const foundTask = tasks.find(task => task.id === selectedTaskId);
      if (foundTask) {
        setEditText(foundTask.content);
        setEditDuration(foundTask.duration || 1);
      }
    }
  }, [selectedTaskId, tasks]);
  
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  function toggleDarkMode() {
    setDarkMode(prevMode => {
      const newMode = !prevMode;
      localStorage.setItem('darkMode', newMode);
      return newMode;
    });
  }

  function toggleSidebar() {
    setSidebarOpen(prev => !prev);
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  async function loadTasks(userId) {
    try {
      const userDocRef = doc(db, 'schedules', userId);
      const userDocData = await getDoc(userDocRef);
      
      if (userDocData.exists()) {
        const userData = userDocData.data();
        setTasks(userData.tasks || []);
        
        if (userData.chartStart) {
          setStartTime(userData.chartStart);
          setTempStartTime(userData.chartStart);
        }
        
        if (userData.chartEnd) {
          setEndTime(userData.chartEnd);
          setTempEndTime(userData.chartEnd);
        }
      } else {
        setTasks([]);
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
  }
  
  async function saveTasks(userId, taskList, chartStartTime = startTime, chartEndTime = endTime) {
    try {
      const userDocRef = doc(db, 'schedules', userId);
      await setDoc(userDocRef, {
        tasks: taskList,
        chartStart: chartStartTime,
        chartEnd: chartEndTime
      });
    } catch (error) {
      console.error("Error saving tasks:", error);
    }
  }  
  
  function handleDragEnd(result) {
    const { source, destination, draggableId } = result;
    
    if (!destination) {
      return;
    }
    
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }
  
    const taskBeingDragged = tasks.find(task => task.id === draggableId);
    const [newDay, newHour] = destination.droppableId.split('_');
    
    const hourIndex = hours.indexOf(newHour);
    const taskDuration = taskBeingDragged.duration || 1;
    
    if (hourIndex + taskDuration > hours.length) {
      return;
    }
    
    const updatedTask = {
      ...taskBeingDragged,
      day: newDay,
      hour: newHour
    };
    
    const updatedTasks = tasks.filter(task => task.id !== draggableId);
    updatedTasks.push(updatedTask);
    
    setTasks(updatedTasks);
    
    if (user) {
      saveTasks(user.uid, updatedTasks);
    }
  }

  function getTasksForCell(day, hour) {
    const tasksInCell = [];
    
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      
      if (task.day !== day) {
        continue;
      }
      
      const taskStartHourIndex = hours.indexOf(task.hour);
      const currentHourIndex = hours.indexOf(hour);
      const taskDuration = task.duration || 1;
      
      const isHourWithinTaskDuration = (
        currentHourIndex >= taskStartHourIndex && 
        currentHourIndex < taskStartHourIndex + taskDuration
      );
      
      if (isHourWithinTaskDuration) {
        tasksInCell.push(task);
      }
    }
    
    return tasksInCell;
  }

  function addNewTask() {
    if (!newTask.content.trim()) {
      return;
    }
    
    const taskId = `task-${Date.now()}`;
    const taskToAdd = { 
      id: taskId,
      content: newTask.content,
      day: newTask.day,
      hour: newTask.hour,
      duration: newTask.duration
    };
    
    const updatedTaskList = [...tasks, taskToAdd];
    setTasks(updatedTaskList);
    
    if (user) {
      saveTasks(user.uid, updatedTaskList);
    }
    
    setNewTask({ content: '', day: 'Monday', hour: '10:00-11:00', duration: 1 });
  }

  function deleteSelectedTask() {
    const filteredTasks = tasks.filter(task => task.id !== selectedTaskId);
    setTasks(filteredTasks);
    
    if (user) {
      saveTasks(user.uid, filteredTasks);
    }
    
    setSelectedTaskId(null);
    setEditText('');
  }

  function updateSelectedTask() {
    const updatedTaskList = tasks.map(task => {
      if (task.id === selectedTaskId) {
        const updatedTask = {
          ...task,
          duration: editDuration
        };
        
        if (editText.trim() !== '') {
          updatedTask.content = editText;
        }
        
        return updatedTask;
      }
      return task;
    });
    
    setTasks(updatedTaskList);
    
    if (user) {
      saveTasks(user.uid, updatedTaskList);
    }
    
    setSelectedTaskId(null);
    setEditText('');
    setEditDuration(1);
  }

  function cancelTaskEdit() {
    setSelectedTaskId(null);
    setEditText('');
    setEditDuration(1);
  }
  
  async function handleAuthAction() {
    try {
      if (!isLoginMode && authPassword.length < 8) {
        setAuthError('Password must be at least 8 characters long.');
        return;
      }
      
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      } else {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      }
      
      setShowAuthModal(false);
      setAuthError('');
      
    } catch (error) {
      const errorCode = error.code;
      let friendlyMessage = 'An error occurred. Please try again.';
      
      if (errorCode === 'auth/invalid-credential') {
        friendlyMessage = 'Invalid Credentials.';
      } else if (errorCode === 'auth/invalid-email') {
        friendlyMessage = 'Please enter a valid email address.';
      } else if (errorCode === 'auth/email-already-in-use') {
        friendlyMessage = 'This email is already registered.';
      } else if (errorCode === 'auth/weak-password') {
        friendlyMessage = 'Password is too weak. Please use at least 8 characters.';
      }
      
      setAuthError(friendlyMessage);
    }
  }

  function applyTimeSettings() {
    const startIndex = allHours.indexOf(tempStartTime);
    const endIndex = allHours.indexOf(tempEndTime);
    
    if (startIndex >= endIndex) {
      setChartError('Start time must be earlier than end time.');
      return;
    }
    
    if (tasks.length > 0) {
      setChartError('Please clear your schedule before changing the chart time range.');
      return;
    }
    
    setStartTime(tempStartTime);
    setEndTime(tempEndTime);
    setShowSettings(false);
    setChartError('');
    
    if (user) {
      saveTasks(user.uid, tasks, tempStartTime, tempEndTime);
    }
  }

  async function loadProfilePicture(userId, userEmail) {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDocData = await getDoc(userDocRef);
      
      if (userDocData.exists() && userDocData.data().profilePicture) {
        setProfilePicture(userDocData.data().profilePicture);
      } else {
        setProfilePicture(`https://ui-avatars.com/api/?name=${userEmail.charAt(0)}&background=random`);
      }
    } catch (error) {
      console.error("Error loading profile picture:", error);
      setProfilePicture(`https://ui-avatars.com/api/?name=${userEmail.charAt(0)}&background=random`);
    }
  }

  async function saveProfilePicture(userId, pictureUrl) {
    try {
      const userDocRef = doc(db, 'users', userId);
      await setDoc(userDocRef, { profilePicture: pictureUrl }, { merge: true });
      setProfilePicture(pictureUrl);
    } catch (error) {
      console.error("Error saving profile picture:", error);
    }
  }

  function handleProfilePictureChange() {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadError('');
    setShowProfileUploadModal(true);
  }
  
  function handleFileSelect(event) {
    const file = event.target.files[0];
    handleFileValidation(file);
  }
  
  function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.add('drag-over');
  }
  
  function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('drag-over');
  }
  
  function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('drag-over');
    
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      handleFileValidation(event.dataTransfer.files[0]);
    }
  }
  
  function handleFileValidation(file) {
    setUploadError('');
    if (!file.type.match('image.*')) {
      setUploadError('Please select an image file (PNG, JPG, JPEG, GIF)');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Image size should be less than 2MB');
      return;
    }
    
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  }
  
  function handleProfileUpload() {
    if (!selectedFile || !user) {
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      saveProfilePicture(user.uid, base64String);
      setShowProfileUploadModal(false);
    };
    reader.readAsDataURL(selectedFile);
  }
  
  function closeUploadModal() {
    setShowProfileUploadModal(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadError('');
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (showProfileDropdown && !event.target.closest('.profile-section')) {
        setShowProfileDropdown(false);
      }
      
      if (sidebarOpen && 
          !event.target.closest('.sidebar') && 
          !event.target.closest('.hamburger-button')) {
        setSidebarOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileDropdown, sidebarOpen]);

  const selectedTask = tasks.find(task => task.id === selectedTaskId);
  
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="weekly-schedule-wrapper">
        <h1 className="schedule-title">🗓 Weekly Schedule App</h1>
        
        <button 
          className={`hamburger-button ${sidebarOpen ? 'hidden' : ''}`} 
          onClick={toggleSidebar}
        >
          ☰
        </button>
        
        <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h3 className="sidebar-title">Menu</h3>
            <button className="sidebar-close" onClick={closeSidebar}>✕</button>
          </div>
          <div className="sidebar-menu">
            <button className="dark-mode-toggle" onClick={toggleDarkMode}>
              <span>
                <span className="sidebar-item-icon">{darkMode ? '☀️' : '🌙'}</span>
                {darkMode ? 'Light Mode' : 'Dark Mode'}
              </span>
            </button>
            
            <div className="sidebar-item">
              <span className="sidebar-item-icon">📅</span>
              Schedule
            </div>
          </div>
        </div>
        
        <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={closeSidebar}></div>
        
        {!user && (
          <button className="login-button" onClick={() => setShowAuthModal(true)}>
            Login
          </button>
        )}
        
        {user && (
          <div className="profile-section">
            <button 
              className="profile-avatar-button" 
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            >
              <img 
                src={profilePicture || `https://ui-avatars.com/api/?name=${user.email.charAt(0)}&background=random`} 
                alt="Profile" 
                className="profile-avatar" 
              />
            </button>
            
            {showProfileDropdown && (
              <div className="profile-dropdown">
                <div className="profile-header">
                  {/* <img 
                    src={profilePicture || `https://ui-avatars.com/api/?name=${user.email.charAt(0)}&background=random`} 
                    alt="Profile" 
                    className="profile-dropdown-avatar" 
                  /> */}
                  <div className="profile-info">
                    <span className="profile-email">{user.email}</span>
                  </div>
                </div>
                <div className="profile-actions">
                  <button className="profile-button" onClick={handleProfilePictureChange}>
                    Change Profile Picture
                  </button>
                  <button className="profile-button logout" onClick={() => signOut(auth)}>
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="form-card">
          <h3>{selectedTask ? 'Edit Selected Task' : 'Add a Schedule'}</h3>
          
          <div className="form-controls">
            <input
              type="text"
              placeholder="Task name"
              value={selectedTask ? editText : newTask.content}
              onChange={(e) => {
                if (selectedTask) {
                  setEditText(e.target.value);
                } else {
                  setNewTask({ ...newTask, content: e.target.value });
                }
              }}
            />
            
            <select
              value={selectedTask ? selectedTask.day : newTask.day}
              onChange={(e) => {
                if (!selectedTask) {
                  setNewTask({ ...newTask, day: e.target.value });
                }
              }}
              disabled={selectedTask}
            >
              {days.map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
            
            <select
              value={selectedTask ? selectedTask.hour : newTask.hour}
              onChange={(e) => {
                if (!selectedTask) {
                  setNewTask({ ...newTask, hour: e.target.value });
                }
              }}
              disabled={selectedTask}
            >
              {hours.map(hour => (
                <option key={hour} value={hour}>{hour}</option>
              ))}
            </select>
            
            <select
              value={selectedTask ? editDuration : newTask.duration}
              onChange={(e) => {
                const durationValue = parseInt(e.target.value);
                
                if (selectedTask) {
                  setEditDuration(durationValue);
                } else {
                  setNewTask({ ...newTask, duration: durationValue });
                }
              }}
            >
              {[1, 2, 3, 4].map(num => (
                <option key={num} value={num}>
                  {num} hour{num > 1 ? 's' : ''}
                </option>
              ))}
            </select>
            
            {selectedTask ? (
              <>
                <button className="btn green" onClick={updateSelectedTask}>✅ Save</button>
                <button className="btn red" onClick={deleteSelectedTask}>🗑️ Delete</button>
                <button className="btn gray" onClick={cancelTaskEdit}>❌ Cancel</button>
              </>
            ) : (
              <button className="btn blue" onClick={addNewTask}>➕ Add</button>
            )}
          </div>
        </div>
        
        <div className="chart-settings">
          <button className="btn gray" onClick={() => setShowSettings(!showSettings)}>
            Chart Settings ⚙️
          </button>

          {showSettings && (
            <div className="chart-settings-panel">
              <div className="time-setting-controls">
                <div className="time-setting-group">
                  <label>Start Time:</label>
                  <select 
                    value={tempStartTime} 
                    onChange={(e) => setTempStartTime(e.target.value)}
                  >
                    {allHours.map(hour => (
                      <option key={hour} value={hour}>{hour}</option>
                    ))}
                  </select>
                </div>

                <div className="time-setting-group">
                  <label>End Time:</label>
                  <select 
                    value={tempEndTime} 
                    onChange={(e) => setTempEndTime(e.target.value)}
                  >
                    {allHours.map(hour => (
                      <option key={hour} value={hour}>{hour}</option>
                    ))}
                  </select>
                </div>

                <button
                  className="btn blue"
                  onClick={applyTimeSettings}
                >
                  Apply
                </button>
              </div>
              
              {chartError && <p className="chart-error">{chartError}</p>}
            </div>
          )}
        </div>

        <div className="schedule-grid-wrapper">
          <div className="schedule-grid">
            <div className="schedule-header">Time</div>
            
            {days.map(day => (
              <div key={day} className="schedule-header">{day}</div>
            ))}
            
            {hours.map(hour => (
              <React.Fragment key={hour}>
                <div className="schedule-label">{hour}</div>
                
                {days.map(day => (
                  <Droppable droppableId={`${day}_${hour}`} key={`${day}_${hour}`}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="schedule-cell"
                      >
                        {getTasksForCell(day, hour).map((task, index) => {
                          const isStartingHour = task.hour === hour;
                          
                          if (isStartingHour) {
                            return (
                              <Draggable 
                                draggableId={task.id} 
                                index={index} 
                                key={task.id}
                              >
                                {(provided) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`schedule-task ${selectedTaskId === task.id ? 'selected' : ''}`}
                                    onClick={() => {
                                      if (selectedTaskId === task.id) {
                                        setSelectedTaskId(null);
                                      } else {
                                        setSelectedTaskId(task.id);
                                      }
                                    }}
                                  >
                                    {task.content}
                                    {task.duration > 1 && (
                                      <span className="task-duration"> ({task.duration} hrs)</span>
                                    )}
                                  </div>
                                )}
                              </Draggable>
                            );
                          } else {
                            return (
                              <div 
                                key={`${task.id}-continuation-${hour}`}
                                className={`schedule-task continuation ${selectedTaskId === task.id ? 'selected' : ''}`}
                                onClick={() => {
                                  if (selectedTaskId === task.id) {
                                    setSelectedTaskId(null);
                                  } else {
                                    setSelectedTaskId(task.id);
                                  }
                                }}
                              >
                                {task.content}
                                <span className="continued-marker">↑</span>
                              </div>
                            );
                          }
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
      
      {showAuthModal && (
        <div className="auth-modal-overlay">
          <div className="auth-modal">
            <button 
              className="auth-close" 
              onClick={() => setShowAuthModal(false)}
            >
              X
            </button>
            
            <h2>{isLoginMode ? 'Login' : 'Register'}</h2>
            
            <input
              type="email"
              placeholder="Email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
            />
            
            <input
              type="password"
              placeholder="Password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
            />
            
            {authError && <p className="auth-error">{authError}</p>}
            
            <button
              className="btn blue"
              onClick={handleAuthAction}
            >
              {isLoginMode ? 'Login' : 'Register'}
            </button>

            <p style={{ marginTop: '10px' }}>
              {isLoginMode ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                className="text-link"
                onClick={() => setIsLoginMode(!isLoginMode)}
              >
                {isLoginMode ? 'Register' : 'Login'}
              </button>
            </p>
          </div>
        </div>
      )}

      {showProfileUploadModal && (
        <div className="profile-upload-modal-overlay">
          <div className="profile-upload-modal">
            <h3>Upload Profile Picture</h3>
            
            <div 
              className="upload-area"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
            >
              {!previewUrl ? (
                <>
                  <div className="upload-icon">📁</div>
                  <p className="upload-text">Drag & drop an image here or click to select</p>
                  <button className="choose-file-btn">Choose File</button>
                </>
              ) : (
                <div className="image-preview-container">
                  <img src={previewUrl} alt="Preview" className="image-preview" />
                </div>
              )}
              
              <input 
                type="file"
                className="file-input"
                accept="image/*"
                onChange={handleFileSelect}
                ref={fileInputRef}
              />
            </div>
            
            {uploadError && <p className="upload-error">{uploadError}</p>}
            
            <div className="upload-actions">
              <button 
                className="btn blue" 
                onClick={handleProfileUpload}
                disabled={!selectedFile}
              >
                Upload
              </button>
              <button className="btn gray" onClick={closeUploadModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </DragDropContext>
  );
}

export default WeeklySchedule;