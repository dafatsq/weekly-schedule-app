import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import './WeeklySchedule.css';
import { auth } from './firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged} from 'firebase/auth';
import { db } from './firebase';
import {
  collection,
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


// ...imports
const WeeklySchedule = () => {
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


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        loadTasks(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const startIndex = allHours.findIndex(h => h === startTime);
    const endIndex = allHours.findIndex(h => h === endTime);
    const sliced = allHours.slice(startIndex, endIndex + 1);
    setHours(sliced);
  }, [startTime, endTime]);

  const loadTasks = async (uid) => {
    try {
      const docRef = doc(db, 'schedules', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTasks(data.tasks || []);
        setStartTime(data.chartStart || '03:00-04:00');
        setEndTime(data.chartEnd || '21:00-22:00');
        setTempStartTime(data.chartStart || '03:00-04:00');
        setTempEndTime(data.chartEnd || '21:00-22:00');
      } else {
        setTasks([]);
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
  };
  
  const saveTasks = async (uid, taskList, chartStart = startTime, chartEnd = endTime) => {
    try {
      await setDoc(doc(db, 'schedules', uid), {
        tasks: taskList,
        chartStart,
        chartEnd
      });
    } catch (error) {
      console.error("Error saving tasks:", error);
    }
  };  
  
  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
  
    const draggedTask = tasks.find((task) => task.id === draggableId);
    const [day, hour] = destination.droppableId.split('_');
    
    // Check if there's enough space for the multi-hour task
    const hourIndex = hours.indexOf(hour);
    const requiredSpace = draggedTask.duration || 1;
    if (hourIndex + requiredSpace > hours.length) {
      // Not enough space at the end of the day
      return;
    }
    
    const updatedTask = { ...draggedTask, day, hour };
    const newTasks = tasks.filter((task) => task.id !== draggableId).concat(updatedTask);
    setTasks(newTasks);
    if (user) saveTasks(user.uid, newTasks);    
  };

  const getTasks = (day, hour) => {
    return tasks.filter((task) => {
      if (task.day !== day) return false;
      
      // Get the starting hour index
      const startHourIndex = hours.indexOf(task.hour);
      // Get the current hour index
      const currentHourIndex = hours.indexOf(hour);
      
      // Check if the current hour is within the task's duration
      return currentHourIndex >= startHourIndex && 
             currentHourIndex < startHourIndex + (task.duration || 1);
    });
  };

  const addTask = () => {
    if (!newTask.content.trim()) return;
    const id = `task-${Date.now()}`;
    const updatedTaskList = [...tasks, { id, ...newTask }];
    setTasks(updatedTaskList);
    if (user) saveTasks(user.uid, updatedTaskList);    
    setNewTask({ content: '', day: 'Monday', hour: '10:00-11:00', duration: 1 });
  };

  const deleteTask = () => {
    const updatedTaskList = tasks.filter(task => task.id !== selectedTaskId);
    setTasks(updatedTaskList);
    if (user) saveTasks(user.uid, updatedTaskList);    
    setSelectedTaskId(null);
    setEditText('');
  };

  const updateTask = () => {
    const updatedTaskList = tasks.map((task) =>
      task.id === selectedTaskId
        ? {
            ...task,
            content: editText.trim() !== '' ? editText : task.content,
            duration: editDuration
          }
        : task
    );
    setTasks(updatedTaskList);
    if (user) saveTasks(user.uid, updatedTaskList);    
    setSelectedTaskId(null);
    setEditText('');
    setEditDuration(1);
  };
  const selectedTask = tasks.find(task => task.id === selectedTaskId);
  
  React.useEffect(() => {
    if (selectedTask) {
      setEditDuration(selectedTask.duration || 1);
    }
  }, [selectedTask]);
  
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="weekly-schedule-wrapper">
        <h1 className="schedule-title">🗓 Weekly Schedule App</h1>
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
                selectedTask
                  ? setEditText(e.target.value)
                  : setNewTask({ ...newTask, content: e.target.value });
              }}
            />
            <select
              value={selectedTask ? selectedTask.day : newTask.day}
              onChange={(e) => {
                if (selectedTask) return;
                setNewTask({ ...newTask, day: e.target.value });
              }}
              disabled={selectedTask}
            >
              {days.map(day => <option key={day} value={day}>{day}</option>)}
            </select>
            <select
              value={selectedTask ? selectedTask.hour : newTask.hour}
              onChange={(e) => {
                if (selectedTask) return;
                setNewTask({ ...newTask, hour: e.target.value });
              }}
              disabled={selectedTask}
            >
              {hours.map(hour => <option key={hour} value={hour}>{hour}</option>)}
            </select>
            <select
              value={selectedTask ? editDuration : newTask.duration}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (selectedTask) {
                  setEditDuration(value);
                } else {
                  setNewTask({ ...newTask, duration: value });
                }
              }}
            >
              {[1, 2, 3, 4].map(num => <option key={num} value={num}>{num} hour{num > 1 ? 's' : ''}</option>)}
            </select>
            {selectedTask ? (
              <>
                <button className="btn green" onClick={updateTask}>✅ Save</button>
                <button className="btn red" onClick={deleteTask}>🗑️ Delete</button>
                <button className="btn gray" onClick={() => {
                  setSelectedTaskId(null);
                  setEditText('');
                  setEditDuration(1);
                }}>❌ Cancel</button>
              </>
            ) : (
              <button className="btn blue" onClick={addTask}>➕ Add</button>
            )}
          </div>
        </div>
        <div className="chart-settings">
          <button className="btn gray" onClick={() => setShowSettings(!showSettings)}>
            Chart Settings ⚙️
          </button>

          {showSettings && (
            <div className="chart-settings-panel">
              <label>Start Time:</label>
              <select value={tempStartTime} onChange={(e) => setTempStartTime(e.target.value)}>
                {allHours.map(hour => (
                  <option key={hour} value={hour}>{hour}</option>
                ))}
              </select>

              <label>End Time:</label>
              <select value={tempEndTime} onChange={(e) => setTempEndTime(e.target.value)}>
                {allHours.map(hour => (
                  <option key={hour} value={hour}>{hour}</option>
                ))}
              </select>

              <button
                className="btn blue"
                onClick={() => {
                  if (tasks.length > 0) {
                    setChartError('Please clear your schedule before changing the chart time range.');
                    return;
                  }
                  setStartTime(tempStartTime);
                  setEndTime(tempEndTime);
                  setShowSettings(false);
                  setChartError('');
                  if (user) saveTasks(user.uid, tasks, tempStartTime, tempEndTime);
                }}
              >
                Apply
              </button>
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
                        {getTasks(day, hour).map((task, index) => {
                          const isStartingHour = task.hour === hour;
                          
                          return isStartingHour ? (
                            <Draggable draggableId={task.id} index={index} key={task.id}>
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`schedule-task ${selectedTaskId === task.id ? 'selected' : ''}`}
                                  onClick={() =>
                                    setSelectedTaskId(task.id === selectedTaskId ? null : task.id)
                                  }
                                >
                                  {task.content}
                                  {task.duration > 1 && <span className="task-duration"> ({task.duration} hrs)</span>}
                                </div>
                              )}
                            </Draggable>
                          ) : (
                            // Non-draggable continuation marker
                            <div 
                              key={`${task.id}-continuation-${hour}`}
                              className={`schedule-task continuation ${selectedTaskId === task.id ? 'selected' : ''}`}
                              onClick={() => setSelectedTaskId(task.id === selectedTaskId ? null : task.id)}
                            >
                              {task.content}
                              <span className="continued-marker">↑</span>
                            </div>
                          );
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
            <button className="auth-close" onClick={() => setShowAuthModal(false)}>X</button>
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
              onClick={async () => {
                try {
                  if (isLoginMode) {
                    await signInWithEmailAndPassword(auth, authEmail, authPassword);
                  } else {
                    await createUserWithEmailAndPassword(auth, authEmail, authPassword);
                  }
                  setShowAuthModal(false);
                  setAuthError('');
                } catch (error) {
                  setAuthError(error.message);
                  const errorCode = error.code;
                  let friendlyMessage = 'An error occurred. Please try again.';
                  if (errorCode === 'auth/invalid-credential') {
                    friendlyMessage = 'Invalid Credentials.';
                  } else if (errorCode === 'auth/invalid-email') {
                    friendlyMessage = 'Please enter a valid email address.';
                  } else if (errorCode === 'auth/email-already-in-use') {
                    friendlyMessage = 'This email is already registered.';
                  } 
                  setAuthError(friendlyMessage);
                }
              }}
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
};

export default WeeklySchedule;
