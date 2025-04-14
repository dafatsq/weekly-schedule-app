import React, { useState, useEffect, useRef } from 'react';
import './TripMaster.css';
import { auth } from './firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged} from 'firebase/auth';
import { db } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  startAfter,
  orderBy
} from 'firebase/firestore';

// Define initial page for the app
const PAGES = {
  DESTINATIONS: 'destinations',
  VACATIONS: 'vacations',
  USERS: 'users',
  BOOKINGS: 'bookings'
};

function TripMaster() {
  // Authentication States
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  
  // UI States
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode === 'true';
  });
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(PAGES.DESTINATIONS);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Profile Upload States
  const [showProfileUploadModal, setShowProfileUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);
  
  // CRUD States
  const [destinations, setDestinations] = useState([]);
  const [vacations, setVacations] = useState([]);
  const [userList, setUserList] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form States
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({});
  const [editingId, setEditingId] = useState(null);
  
  // Pagination States
  const [lastVisible, setLastVisible] = useState(null);
  const [pageSize] = useState(10);

  // Confirmation Dialog State
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  useEffect(() => {
    const checkUserStatus = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        loadProfilePicture(currentUser.uid, currentUser.email);
        loadData(currentPage);
      }
    });
    
    return () => checkUserStatus();
  }, [currentPage]);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

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

  async function loadData(page = currentPage, isNewSearch = false) {
    if (!user) return;
    
    setIsLoading(true);
    let collectionName = '';
    
    switch (page) {
      case PAGES.DESTINATIONS:
        collectionName = 'destinations';
        break;
      case PAGES.VACATIONS:
        collectionName = 'vacations';
        break;
      case PAGES.USERS:
        collectionName = 'users';
        break;
      case PAGES.BOOKINGS:
        collectionName = 'bookings';
        break;
      default:
        collectionName = 'destinations';
    }
    
    try {
      let q;
      
      if (isNewSearch && searchTerm) {
        // Search implementation varies based on the entity
        // For simplicity, searching by name/city across all fields
        q = query(
          collection(db, collectionName), 
          orderBy("createdAt", "desc"),
          limit(pageSize)
        );
        // Note: In a real implementation, you'd add proper where clauses based on searchTerm
      } else if (!isNewSearch && lastVisible && !searchTerm) {
        q = query(
          collection(db, collectionName),
          orderBy("createdAt", "desc"),
          startAfter(lastVisible),
          limit(pageSize)
        );
      } else {
        q = query(
          collection(db, collectionName),
          orderBy("createdAt", "desc"),
          limit(pageSize)
        );
      }
      
      const querySnapshot = await getDocs(q);
      const items = [];
      
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      
      // Set last document for pagination
      if (!querySnapshot.empty) {
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
      } else {
        setLastVisible(null);
      }
      
      // Update the appropriate state based on page
      switch (page) {
        case PAGES.DESTINATIONS:
          setDestinations(isNewSearch || searchTerm ? items : [...destinations, ...items]);
          break;
        case PAGES.VACATIONS:
          setVacations(isNewSearch || searchTerm ? items : [...vacations, ...items]);
          break;
        case PAGES.USERS:
          setUserList(isNewSearch || searchTerm ? items : [...userList, ...items]);
          break;
        case PAGES.BOOKINGS:
          setBookings(isNewSearch || searchTerm ? items : [...bookings, ...items]);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSearch() {
    await loadData(currentPage, true);
  }

  function initializeForm(page) {
    switch (page) {
      case PAGES.DESTINATIONS:
        return { city: '', price: '', discount: '', country: '', rating: '5', quota: '10', createdAt: Date.now() };
      case PAGES.VACATIONS:
        return { city: '', country: '', price: '', dayTrip: '', rating: '5', quota: '10', createdAt: Date.now() };
      case PAGES.USERS:
        return { name: '', phoneNumber: '', createdAt: Date.now() };
      case PAGES.BOOKINGS:
        return { name: '', phoneNumber: '', destination: '', type: 'destination', createdAt: Date.now() };
      default:
        return {};
    }
  }

  function handleAddNew() {
    setFormData(initializeForm(currentPage));
    setEditingId(null);
    setShowForm(true);
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  }

  function handleEditItem(item) {
    setFormData(item);
    setEditingId(item.id);
    setShowForm(true);
  }

  function handleDeleteConfirmation(item) {
    setItemToDelete(item);
    setShowConfirmation(true);
  }

  async function handleDeleteItem() {
    if (!itemToDelete || !itemToDelete.id) return;
    
    try {
      let collectionName = '';
      
      switch (currentPage) {
        case PAGES.DESTINATIONS:
          collectionName = 'destinations';
          break;
        case PAGES.VACATIONS:
          collectionName = 'vacations';
          break;
        case PAGES.USERS:
          collectionName = 'users';
          break;
        case PAGES.BOOKINGS:
          collectionName = 'bookings';
          break;
        default:
          return;
      }
      
      await deleteDoc(doc(db, collectionName, itemToDelete.id));
      
      // Update the UI
      switch (currentPage) {
        case PAGES.DESTINATIONS:
          setDestinations(destinations.filter(dest => dest.id !== itemToDelete.id));
          break;
        case PAGES.VACATIONS:
          setVacations(vacations.filter(vac => vac.id !== itemToDelete.id));
          break;
        case PAGES.USERS:
          setUserList(userList.filter(user => user.id !== itemToDelete.id));
          break;
        case PAGES.BOOKINGS:
          setBookings(bookings.filter(booking => booking.id !== itemToDelete.id));
          break;
        default:
          break;
      }
    } catch (error) {
      console.error("Error deleting item:", error);
    } finally {
      setShowConfirmation(false);
      setItemToDelete(null);
    }
  }

  async function handleSubmitForm(e) {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      let collectionName = '';
      
      switch (currentPage) {
        case PAGES.DESTINATIONS:
          collectionName = 'destinations';
          break;
        case PAGES.VACATIONS:
          collectionName = 'vacations';
          break;
        case PAGES.USERS:
          collectionName = 'users';
          break;
        case PAGES.BOOKINGS:
          collectionName = 'bookings';
          break;
        default:
          collectionName = 'destinations';
      }
      
      if (editingId) {
        // Update existing item
        await updateDoc(doc(db, collectionName, editingId), formData);
        
        // Update the UI
        switch (currentPage) {
          case PAGES.DESTINATIONS:
            setDestinations(destinations.map(dest => 
              dest.id === editingId ? { ...formData, id: editingId } : dest
            ));
            break;
          case PAGES.VACATIONS:
            setVacations(vacations.map(vac => 
              vac.id === editingId ? { ...formData, id: editingId } : vac
            ));
            break;
          case PAGES.USERS:
            setUserList(userList.map(user => 
              user.id === editingId ? { ...formData, id: editingId } : user
            ));
            break;
          case PAGES.BOOKINGS:
            setBookings(bookings.map(booking => 
              booking.id === editingId ? { ...formData, id: editingId } : booking
            ));
            break;
          default:
            break;
        }
      } else {
        // Add new item
        const docRef = await addDoc(collection(db, collectionName), formData);
        const newItem = { ...formData, id: docRef.id };
        
        // Update the UI
        switch (currentPage) {
          case PAGES.DESTINATIONS:
            setDestinations([newItem, ...destinations]);
            break;
          case PAGES.VACATIONS:
            setVacations([newItem, ...vacations]);
            break;
          case PAGES.USERS:
            setUserList([newItem, ...userList]);
            break;
          case PAGES.BOOKINGS:
            setBookings([newItem, ...bookings]);
            break;
          default:
            break;
        }
      }
      
      // Reset form
      setShowForm(false);
      setFormData({});
      setEditingId(null);
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  }

  function validateForm() {
    // Basic validation - ensure all fields have values
    for (const key in formData) {
      if (key === 'id' || key === 'createdAt') continue;
      
      if (!formData[key]) {
        return false;
      }
    }
    return true;
  }

  function isFormValid() {
    return validateForm();
  }

  function cancelForm() {
    setShowForm(false);
    setFormData({});
    setEditingId(null);
  }

  function navigateTo(page) {
    setCurrentPage(page);
    setDestinations([]);
    setVacations([]);
    setUserList([]);
    setBookings([]);
    setLastVisible(null);
    setSearchTerm('');
    loadData(page, true);
    closeSidebar();
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

  // Render tables based on current page
  const renderTable = () => {
    switch (currentPage) {
      case PAGES.DESTINATIONS:
        return (
          <div className="data-table-container">
            <h2>Manage Destinations</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>City</th>
                  <th>Price</th>
                  <th>Discount</th>
                  <th>Country</th>
                  <th>Rating</th>
                  <th>Quota</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {destinations.length > 0 ? destinations.map(dest => (
                  <tr key={dest.id}>
                    <td>{dest.city}</td>
                    <td>${dest.price}</td>
                    <td>{dest.discount}%</td>
                    <td>{dest.country}</td>
                    <td>{dest.rating}/5</td>
                    <td>{dest.quota}</td>
                    <td className="table-actions">
                      <button className="btn blue" onClick={() => handleEditItem(dest)}>Edit</button>
                      <button className="btn red" onClick={() => handleDeleteConfirmation(dest)}>Delete</button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="7" className="no-data">No destinations found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      case PAGES.VACATIONS:
        return (
          <div className="data-table-container">
            <h2>Manage Vacation Plans</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>City</th>
                  <th>Country</th>
                  <th>Price</th>
                  <th>Day Trip</th>
                  <th>Rating</th>
                  <th>Quota</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vacations.length > 0 ? vacations.map(vac => (
                  <tr key={vac.id}>
                    <td>{vac.city}</td>
                    <td>{vac.country}</td>
                    <td>${vac.price}</td>
                    <td>{vac.dayTrip}</td>
                    <td>{vac.rating}/5</td>
                    <td>{vac.quota}</td>
                    <td className="table-actions">
                      <button className="btn blue" onClick={() => handleEditItem(vac)}>Edit</button>
                      <button className="btn red" onClick={() => handleDeleteConfirmation(vac)}>Delete</button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="7" className="no-data">No vacation plans found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      case PAGES.USERS:
        return (
          <div className="data-table-container">
            <h2>Manage Users</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone Number</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {userList.length > 0 ? userList.map(user => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.phoneNumber}</td>
                    <td className="table-actions">
                      <button className="btn blue" onClick={() => handleEditItem(user)}>Edit</button>
                      <button className="btn red" onClick={() => handleDeleteConfirmation(user)}>Delete</button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="3" className="no-data">No users found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      case PAGES.BOOKINGS:
        return (
          <div className="data-table-container">
            <h2>Manage Bookings</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone Number</th>
                  <th>Destination/Vacation</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length > 0 ? bookings.map(booking => (
                  <tr key={booking.id}>
                    <td>{booking.name}</td>
                    <td>{booking.phoneNumber}</td>
                    <td>{booking.destination}</td>
                    <td className="table-actions">
                      <button className="btn blue" onClick={() => handleEditItem(booking)}>Edit</button>
                      <button className="btn red" onClick={() => handleDeleteConfirmation(booking)}>Delete</button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="no-data">No bookings found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      default:
        return <div>Select a category from the sidebar</div>;
    }
  };

  const renderForm = () => {
    switch (currentPage) {
      case PAGES.DESTINATIONS:
        return (
          <div className="form-card">
            <h3>{editingId ? 'Edit Destination' : 'Add New Destination'}</h3>
            <form onSubmit={handleSubmitForm}>
              <div className="form-controls">
                <input
                  type="text"
                  name="city"
                  placeholder="City"
                  value={formData.city || ''}
                  onChange={handleFormChange}
                  required
                />
                <input
                  type="number"
                  name="price"
                  placeholder="Price"
                  value={formData.price || ''}
                  onChange={handleFormChange}
                  required
                />
                <input
                  type="number"
                  name="discount"
                  placeholder="Discount %"
                  value={formData.discount || ''}
                  onChange={handleFormChange}
                  required
                />
                <input
                  type="text"
                  name="country"
                  placeholder="Country"
                  value={formData.country || ''}
                  onChange={handleFormChange}
                  required
                />
                <select
                  name="rating"
                  value={formData.rating || '5'}
                  onChange={handleFormChange}
                  required
                >
                  <option value="1">1 Star</option>
                  <option value="2">2 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="5">5 Stars</option>
                </select>
                <input
                  type="number"
                  name="quota"
                  placeholder="Quota"
                  value={formData.quota || ''}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn green" disabled={!isFormValid()}>
                  {editingId ? 'Update' : 'Submit'}
                </button>
                <button type="button" className="btn gray" onClick={cancelForm}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        );
      case PAGES.VACATIONS:
        return (
          <div className="form-card">
            <h3>{editingId ? 'Edit Vacation Plan' : 'Add New Vacation Plan'}</h3>
            <form onSubmit={handleSubmitForm}>
              <div className="form-controls">
                <input
                  type="text"
                  name="city"
                  placeholder="City"
                  value={formData.city || ''}
                  onChange={handleFormChange}
                  required
                />
                <input
                  type="text"
                  name="country"
                  placeholder="Country"
                  value={formData.country || ''}
                  onChange={handleFormChange}
                  required
                />
                <input
                  type="number"
                  name="price"
                  placeholder="Price"
                  value={formData.price || ''}
                  onChange={handleFormChange}
                  required
                />
                <input
                  type="number"
                  name="dayTrip"
                  placeholder="Days"
                  value={formData.dayTrip || ''}
                  onChange={handleFormChange}
                  required
                />
                <select
                  name="rating"
                  value={formData.rating || '5'}
                  onChange={handleFormChange}
                  required
                >
                  <option value="1">1 Star</option>
                  <option value="2">2 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="5">5 Stars</option>
                </select>
                <input
                  type="number"
                  name="quota"
                  placeholder="Quota"
                  value={formData.quota || ''}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn green" disabled={!isFormValid()}>
                  {editingId ? 'Update' : 'Submit'}
                </button>
                <button type="button" className="btn gray" onClick={cancelForm}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        );
      case PAGES.USERS:
        return (
          <div className="form-card">
            <h3>{editingId ? 'Edit User' : 'Add New User'}</h3>
            <form onSubmit={handleSubmitForm}>
              <div className="form-controls">
                <input
                  type="text"
                  name="name"
                  placeholder="Name"
                  value={formData.name || ''}
                  onChange={handleFormChange}
                  required
                />
                <input
                  type="text"
                  name="phoneNumber"
                  placeholder="Phone Number"
                  value={formData.phoneNumber || ''}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn green" disabled={!isFormValid()}>
                  {editingId ? 'Update' : 'Submit'}
                </button>
                <button type="button" className="btn gray" onClick={cancelForm}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        );
      case PAGES.BOOKINGS:
        return (
          <div className="form-card">
            <h3>{editingId ? 'Edit Booking' : 'Add New Booking'}</h3>
            <form onSubmit={handleSubmitForm}>
              <div className="form-controls">
                <input
                  type="text"
                  name="name"
                  placeholder="Name"
                  value={formData.name || ''}
                  onChange={handleFormChange}
                  required
                />
                <input
                  type="text"
                  name="phoneNumber"
                  placeholder="Phone Number"
                  value={formData.phoneNumber || ''}
                  onChange={handleFormChange}
                  required
                />
                <select
                  name="type"
                  value={formData.type || 'destination'}
                  onChange={handleFormChange}
                  required
                >
                  <option value="destination">Destination</option>
                  <option value="vacation">Vacation</option>
                </select>
                <input
                  type="text"
                  name="destination"
                  placeholder={formData.type === 'vacation' ? 'Vacation Name' : 'Destination Name'}
                  value={formData.destination || ''}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn green" disabled={!isFormValid()}>
                  {editingId ? 'Update' : 'Submit'}
                </button>
                <button type="button" className="btn gray" onClick={cancelForm}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="tripmaster-wrapper">
      <h1 className="app-title">🌴 TripMaster</h1>
      
      <button 
        className={`hamburger-button ${sidebarOpen ? 'hidden' : ''}`} 
        onClick={toggleSidebar}
      >
        ☰
      </button>
      
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3 className="sidebar-title">TripMaster</h3>
          <button className="sidebar-close" onClick={closeSidebar}>✕</button>
        </div>
        <div className="sidebar-menu">
          <div 
            className={`sidebar-item ${currentPage === PAGES.DESTINATIONS ? 'active' : ''}`}
            onClick={() => navigateTo(PAGES.DESTINATIONS)}
          >
            <span className="sidebar-item-icon">🏙️</span>
            Manage Destinations
          </div>
          <div 
            className={`sidebar-item ${currentPage === PAGES.VACATIONS ? 'active' : ''}`}
            onClick={() => navigateTo(PAGES.VACATIONS)}
          >
            <span className="sidebar-item-icon">🏝️</span>
            Manage Vacation Plans
          </div>
          <div 
            className={`sidebar-item ${currentPage === PAGES.USERS ? 'active' : ''}`}
            onClick={() => navigateTo(PAGES.USERS)}
          >
            <span className="sidebar-item-icon">👥</span>
            Manage Users
          </div>
          <div 
            className={`sidebar-item ${currentPage === PAGES.BOOKINGS ? 'active' : ''}`}
            onClick={() => navigateTo(PAGES.BOOKINGS)}
          >
            <span className="sidebar-item-icon">📒</span>
            Manage Bookings
          </div>
          
          <button className="dark-mode-toggle" onClick={toggleDarkMode}>
            <span>
              <span className="sidebar-item-icon">{darkMode ? '☀️' : '🌙'}</span>
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>
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

      {user && (
        <div className="main-content">
          <div className="search-bar">
            <input
              type="text"
              placeholder={`Search ${currentPage}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="btn blue" onClick={handleSearch}>
              Search
            </button>
            <button className="btn green" onClick={handleAddNew}>
              + Add New
            </button>
          </div>
          
          {showForm ? renderForm() : renderTable()}
          
          {!showForm && (
            <div className="load-more-container">
              {lastVisible && (
                <button 
                  className="btn blue load-more-btn" 
                  onClick={() => loadData()}
                  disabled={isLoading}
                >
                  {isLoading ? 'Loading...' : 'Load More'}
                </button>
              )}
            </div>
          )}
        </div>
      )}
      
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

      {showConfirmation && (
        <div className="confirmation-modal-overlay">
          <div className="confirmation-modal">
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete this item?</p>
            <div className="confirmation-actions">
              <button className="btn red" onClick={handleDeleteItem}>
                Yes, Delete
              </button>
              <button className="btn gray" onClick={() => setShowConfirmation(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TripMaster;