import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    const checkUserStatus = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        loadTasks(currentUser.uid);
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

  const selectedTask = tasks.find(task => task.id === selectedTaskId);
  
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="weekly-schedule-wrapper">
        <h1 className="schedule-title">🗓 Weekly Schedule App</h1>
        
        <button className="dark-mode-button" onClick={toggleDarkMode}>
          {darkMode ? '☀️ Light' : '🌙 Dark'}
        </button>
        
        {!user && (
          <button className="login-button" onClick={() => setShowAuthModal(true)}>
            Login
          </button>
        )}
        
        {user && (
          <div className="auth-top-right">
            <span className="user-email">👤 {user.email}</span>
            <button className="logout-button" onClick={() => signOut(auth)}>Logout</button>
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
    </DragDropContext>
  );
}

export default WeeklySchedule;