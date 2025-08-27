"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CustomToast from "../../../components/CustomToast";
import { user1, user2, user3, user4, user5, user6 } from "../../../assets";

// SVG Icons as inline components for better performance
const EditIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.4374 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const DeleteIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 6H5H21" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="9" cy="7" r="4" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CapacityIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 22V12H15V22" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 6L6 18" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 6L18 18" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const WorkspaceDetails = () => {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id;

  // State management
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    capacity: 0
  });

  // Mock data - replace with actual API call
  const mockWorkspaceData = {
    id: workspaceId,
    name: "Shared Office Space",
    description: "A collaborative workspace designed for teams and individuals who value flexibility and community. Features modern amenities, high-speed internet, and a professional environment perfect for productivity and networking.",
    capacity: 25,
    currentOccupancy: 18,
    status: "Active",
    createdDate: "2024-01-15",
    lastUpdated: "2024-03-10",
    assignedUsers: [
      { id: 1, name: "John Doe", email: "john.doe@example.com", role: "Team Lead", avatar: user1, joinDate: "2024-01-20" },
      { id: 2, name: "Jane Smith", email: "jane.smith@example.com", role: "Developer", avatar: user2, joinDate: "2024-02-01" },
      { id: 3, name: "Mike Johnson", email: "mike.johnson@example.com", role: "Designer", avatar: user3, joinDate: "2024-02-15" },
      { id: 4, name: "Sarah Wilson", email: "sarah.wilson@example.com", role: "Manager", avatar: user4, joinDate: "2024-03-01" },
      { id: 5, name: "David Brown", email: "david.brown@example.com", role: "Analyst", avatar: user5, joinDate: "2024-03-05" },
      { id: 6, name: "Lisa Davis", email: "lisa.davis@example.com", role: "Coordinator", avatar: user6, joinDate: "2024-03-08" }
    ],
    amenities: ["High-speed WiFi", "Meeting Rooms", "Coffee Station", "Printing Facilities", "24/7 Access"]
  };

  // Simulate API call
  useEffect(() => {
    const fetchWorkspaceData = async () => {
      try {
        setLoading(true);
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // In a real app, this would be an actual API call
        // const response = await fetch(`/api/workspaces/${workspaceId}`);
        // const data = await response.json();
        
        setWorkspace(mockWorkspaceData);
        setEditFormData({
          name: mockWorkspaceData.name,
          description: mockWorkspaceData.description,
          capacity: mockWorkspaceData.capacity
        });
      } catch (err) {
        setError("Failed to load workspace data. Please try again.");
        console.error("Error fetching workspace:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaceData();
  }, [workspaceId]);

  // Handle edit form submission
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update local state
      setWorkspace(prev => ({
        ...prev,
        ...editFormData,
        lastUpdated: new Date().toISOString().split('T')[0]
      }));
      
      setShowEditModal(false);
      toast(<CustomToast message="Workspace updated successfully!" />);
    } catch (err) {
      toast(<CustomToast message="Failed to update workspace. Please try again." />);
    }
  };

  // Handle delete confirmation
  const handleDelete = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setShowDeleteModal(false);
      toast(<CustomToast message="Workspace deleted successfully!" />);
      
      // Navigate back to spaces list
      router.push('/spaces');
    } catch (err) {
      toast(<CustomToast message="Failed to delete workspace. Please try again." />);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FEDC44]"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="text-red-500 text-lg font-semibold mb-2">Error</div>
        <div className="text-gray-600 mb-4">{error}</div>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-[#FEDC44] px-4 py-2 rounded-md text-sm font-semibold hover:bg-[#FED017] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Main render
  return (
    <>
      <main className="max-w-6xl mx-auto p-4 sm:p-6">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                {workspace.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${
                    workspace.status === 'Active' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  {workspace.status}
                </span>
                <span>Created: {new Date(workspace.createdDate).toLocaleDateString()}</span>
                <span>Last Updated: {new Date(workspace.lastUpdated).toLocaleDateString()}</span>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
                aria-label="Edit workspace"
              >
                <EditIcon />
                <span className="hidden sm:inline">Edit</span>
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-300"
                aria-label="Delete workspace"
              >
                <DeleteIcon />
                <span className="hidden sm:inline">Delete</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
              <p className="text-gray-700 leading-relaxed">{workspace.description}</p>
            </div>

            {/* Assigned Users Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-2 mb-4">
                <UsersIcon />
                <h2 className="text-lg font-semibold text-gray-900">
                  Assigned Users ({workspace.assignedUsers.length})
                </h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {workspace.assignedUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <img
                      src={user.avatar}
                      alt={`${user.name} avatar`}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{user.name}</h3>
                      <p className="text-sm text-gray-600 truncate">{user.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {user.role}
                        </span>
                        <span className="text-xs text-gray-500">
                          Joined: {new Date(user.joinDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Amenities Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {workspace.amenities.map((amenity, index) => (
                  <span key={index} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Capacity Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-2 mb-4">
                <CapacityIcon />
                <h2 className="text-lg font-semibold text-gray-900">Capacity</h2>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Maximum Capacity</span>
                  <span className="font-semibold text-gray-900">{workspace.capacity} people</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Current Occupancy</span>
                  <span className="font-semibold text-gray-900">{workspace.currentOccupancy} people</span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-[#FEDC44] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(workspace.currentOccupancy / workspace.capacity) * 100}%` }}
                  ></div>
                </div>
                
                <div className="text-center text-sm text-gray-600">
                  {Math.round((workspace.currentOccupancy / workspace.capacity) * 100)}% occupied
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Available Spots</span>
                  <span className="font-semibold text-green-600">
                    {workspace.capacity - workspace.currentOccupancy}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Utilization Rate</span>
                  <span className="font-semibold text-blue-600">
                    {Math.round((workspace.currentOccupancy / workspace.capacity) * 100)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Users</span>
                  <span className="font-semibold text-gray-900">
                    {workspace.assignedUsers.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      {showEditModal && (
        <Dialog
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <DialogBackdrop className="fixed inset-0 bg-black bg-opacity-50" />
          <DialogPanel className="relative z-10 w-full max-w-md bg-white rounded-lg shadow-xl">
            <div className="flex justify-between items-center p-6 border-b">
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Edit Workspace
              </DialogTitle>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close modal"
              >
                <CloseIcon />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FEDC44] focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    rows={4}
                    value={editFormData.description}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FEDC44] focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1">
                    Maximum Capacity
                  </label>
                  <input
                    type="number"
                    id="capacity"
                    min="1"
                    value={editFormData.capacity}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FEDC44] focus:border-transparent"
                    required
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#FEDC44] text-gray-900 rounded-md hover:bg-[#FED017] transition-colors font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </DialogPanel>
        </Dialog>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <Dialog
          open={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <DialogBackdrop className="fixed inset-0 bg-black bg-opacity-50" />
          <DialogPanel className="relative z-10 w-full max-w-md bg-white rounded-lg shadow-xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <DeleteIcon />
                </div>
                <div>
                  <DialogTitle className="text-lg font-semibold text-gray-900">
                    Delete Workspace
                  </DialogTitle>
                  <p className="text-sm text-gray-600">
                    This action cannot be undone
                  </p>
                </div>
              </div>
              
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete <strong>"{workspace.name}"</strong>? 
                This will remove all associated data and cannot be reversed.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-semibold"
                >
                  Delete Workspace
                </button>
              </div>
            </div>
          </DialogPanel>
        </Dialog>
      )}
    </>
  );
};

export default WorkspaceDetails;