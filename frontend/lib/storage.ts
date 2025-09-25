const isBrowser = typeof window !== undefined;


const getNamespacedKey = (key: string): string => {
  return `manageHub_${key}`;
};

const getFromLocalStorage = <T>(key: string, parseData: boolean = true) => {
  if (!isBrowser) return null;

  const namespacedKey = getNamespacedKey(key);
  const data = localStorage.getItem(namespacedKey);
  if (data) {
    return parseData ? (JSON.parse(data) as T) : (data as T);
  }
  return data as T;
};

const saveToLocalStorage = <T>(key: string, value: T) => {
  if (!isBrowser) return false;

  const namespacedKey = getNamespacedKey(key);
  if (localStorage.getItem(namespacedKey)) localStorage.removeItem(namespacedKey);
  try {
    localStorage.setItem(namespacedKey, JSON.stringify(value));
    setCookie(namespacedKey, JSON.stringify(value))
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const removeFromLocalStorage = (key: string) => {
  if (!isBrowser) return false;

  const namespacedKey = getNamespacedKey(key);
  try {
    localStorage.removeItem(namespacedKey);
    deleteCookie(namespacedKey);
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};


const setCookie = (key: string, value: string, days: number = 1): void => {
  if (!isBrowser) return;
  
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(
    value
  )}; max-age=${maxAge}; path=/`;
};

// Added a get cookie helper function should the need arise
// Add to exported storage object if required
const getCookie = (key: string): string | null => {
  if (!isBrowser) return null;

  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${encodeURIComponent(key)}=`))
    ?.split("=")[1]
    ? decodeURIComponent(
        document.cookie
          .split("; ")
          .find((row) => row.startsWith(`${encodeURIComponent(key)}=`))
          ?.split("=")[1] || ""
      )
    : null;
};

const deleteCookie = (key: string): void => {
  if (!isBrowser) return;

  document.cookie = `${encodeURIComponent(
    key
  )}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
};


// Token utils
const getToken = () => {
  return getFromLocalStorage("token", false)
}

const setToken = (token: string) => {
  return saveToLocalStorage("token", token)
}

const removeToken = () => {
  return removeFromLocalStorage("token");
}


// User utils
const getUser = () => {
  return getFromLocalStorage("user")
}

const setUser = (user: any) => {
  return saveToLocalStorage("user", user)
}

const removeUser = () => {
  return removeFromLocalStorage("user");
}


const clear = () => {
  removeToken();
  removeUser();
}


const storage = {
  getToken,
  setToken,
  removeToken,
  getUser,
  setUser,
  removeUser,
  clear,
};

export default storage;