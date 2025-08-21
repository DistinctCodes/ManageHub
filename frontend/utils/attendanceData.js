// Placeholder attendance data
export const attendanceData = [
  {
    id: 1,
    userName: "Ayibaemi Awolowo",
    role: "Software Engineer",
    date: "2024-01-15",
    timeIn: "09:15",
    timeOut: "17:30",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    status: "present"
  },
  {
    id: 2,
    userName: "Diobu Wokoma",
    role: "Product Manager",
    date: "2024-01-15",
    timeIn: "08:45",
    timeOut: "18:00",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    status: "present"
  },
  {
    id: 3,
    userName: "Seiye Tuma",
    role: "Designer",
    date: "2024-01-15",
    timeIn: "09:30",
    timeOut: "17:45",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    status: "present"
  },
  {
    id: 4,
    userName: "Werinipre Benibo",
    role: "Marketing Specialist",
    date: "2024-01-15",
    timeIn: "08:30",
    timeOut: "17:15",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    status: "present"
  },
  {
    id: 5,
    userName: "Ibiagbanibo Amakiri",
    role: "Data Analyst",
    date: "2024-01-15",
    timeIn: "09:00",
    timeOut: "18:30",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    status: "present"
  },
  {
    id: 6,
    userName: "Oyintare Aganaba",
    role: "HR Manager",
    date: "2024-01-15",
    timeIn: "08:15",
    timeOut: "17:00",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
    status: "present"
  },
  {
    id: 7,
    userName: "Moses Jeremiah",
    role: "Software Engineer",
    date: "2024-01-14",
    timeIn: "09:20",
    timeOut: "17:45",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    status: "present"
  },
  {
    id: 8,
    userName: "Sarah Johnson",
    role: "Product Manager",
    date: "2024-01-14",
    timeIn: "08:50",
    timeOut: "18:15",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    status: "present"
  },
  {
    id: 9,
    userName: "Michael Chen",
    role: "Designer",
    date: "2024-01-14",
    timeIn: "09:10",
    timeOut: "17:30",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    status: "present"
  },
  {
    id: 10,
    userName: "Emily Davis",
    role: "Marketing Specialist",
    date: "2024-01-14",
    timeIn: "08:40",
    timeOut: "17:20",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
    status: "present"
  },
  {
    id: 11,
    userName: "David Wilson",
    role: "Data Analyst",
    date: "2024-01-13",
    timeIn: "09:05",
    timeOut: "18:00",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    status: "present"
  },
  {
    id: 12,
    userName: "Lisa Brown",
    role: "HR Manager",
    date: "2024-01-13",
    timeIn: "08:20",
    timeOut: "17:10",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    status: "present"
  },
  {
    id: 13,
    userName: "James Miller",
    role: "Software Engineer",
    date: "2024-01-13",
    timeIn: "09:25",
    timeOut: "17:50",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    status: "present"
  },
  {
    id: 14,
    userName: "Jennifer Lee",
    role: "Product Manager",
    date: "2024-01-12",
    timeIn: "08:55",
    timeOut: "18:05",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    status: "present"
  },
  {
    id: 15,
    userName: "Robert Taylor",
    role: "Designer",
    date: "2024-01-12",
    timeIn: "09:15",
    timeOut: "17:35",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    status: "present"
  }
];

// Available roles for filtering
export const availableRoles = [
  "All Roles",
  "Software Engineer",
  "Product Manager",
  "Designer",
  "Marketing Specialist",
  "Data Analyst",
  "HR Manager"
];

// Helper function to format date
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Helper function to filter data
export const filterAttendanceData = (data, dateFilter, roleFilter) => {
  let filteredData = [...data];

  // Filter by date
  if (dateFilter) {
    filteredData = filteredData.filter(item => item.date === dateFilter);
  }

  // Filter by role
  if (roleFilter && roleFilter !== "All Roles") {
    filteredData = filteredData.filter(item => item.role === roleFilter);
  }

  return filteredData;
};
