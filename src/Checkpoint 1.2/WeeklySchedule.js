import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import './WeeklySchedule.css';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const hours = [
  '03:00-04:00', '04:00-05:00', '05:00-06:00', '06:00-07:00', '07:00-08:00',
  '08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00',
  '13:00-14:00', '14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00',
  '18:00-19:00', '19:00-20:00', '20:00-21:00'
];


// ...imports
const WeeklySchedule = () => {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({ content: '', day: 'Monday', hour: '10:00-11:00', duration: 1 });
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [editText, setEditText] = useState('');

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
    setTasks([...tasks, { id, ...newTask }]);
    setNewTask({ content: '', day: 'Monday', hour: '10:00-11:00', duration: 1 });
  };

  const deleteTask = () => {
    setTasks(tasks.filter(task => task.id !== selectedTaskId));
    setSelectedTaskId(null);
    setEditText('');
  };

  const updateTask = () => {
    setTasks(tasks.map(task => 
      task.id === selectedTaskId ? 
      { ...task, content: editText, duration: selectedTask.duration || 1 } : 
      task
    ));
    setSelectedTaskId(null);
    setEditText('');
  };

  const selectedTask = tasks.find(task => task.id === selectedTaskId);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="weekly-schedule-wrapper">
        <h1 className="schedule-title">🗓 My Weekly Schedule</h1>

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
              value={selectedTask ? selectedTask.duration || 1 : newTask.duration}
              onChange={(e) => {
                if (selectedTask) return;
                setNewTask({ ...newTask, duration: parseInt(e.target.value) });
              }}
              disabled={selectedTask}
            >
              {[1, 2, 3, 4].map(num => <option key={num} value={num}>{num} hour{num > 1 ? 's' : ''}</option>)}
            </select>
            {selectedTask ? (
              <>
                <button className="btn green" onClick={updateTask}>✅ Save</button>
                <button className="btn red" onClick={deleteTask}>🗑️ Delete</button>
                <button className="btn gray" onClick={() => setSelectedTaskId(null)}>❌ Cancel</button>
              </>
            ) : (
              <button className="btn blue" onClick={addTask}>➕ Add</button>
            )}
          </div>
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
    </DragDropContext>
  );
};

export default WeeklySchedule;
