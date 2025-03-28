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
  const [newTask, setNewTask] = useState({ content: '', day: 'Monday', hour: '10:00-11:00' });
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [editText, setEditText] = useState('');

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const draggedTask = tasks.find((task) => task.id === draggableId);
    const [day, hour] = destination.droppableId.split('_');
    const updatedTask = { ...draggedTask, day, hour };
    const newTasks = tasks.filter((task) => task.id !== draggableId).concat(updatedTask);
    setTasks(newTasks);
  };

  const getTasks = (day, hour) => tasks.filter((task) => task.day === day && task.hour === hour);

  const addTask = () => {
    if (!newTask.content.trim()) return;
    const id = `task-${Date.now()}`;
    setTasks([...tasks, { id, ...newTask }]);
    setNewTask({ content: '', day: 'Monday', hour: '10:00-11:00' });
  };

  const deleteTask = () => {
    setTasks(tasks.filter(task => task.id !== selectedTaskId));
    setSelectedTaskId(null);
    setEditText('');
  };

  const updateTask = () => {
    setTasks(tasks.map(task => task.id === selectedTaskId ? { ...task, content: editText } : task));
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
                        {getTasks(day, hour).map((task, index) => (
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
                              </div>
                            )}
                          </Draggable>
                        ))}
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
