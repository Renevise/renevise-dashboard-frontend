export async function apiFetch(url, options = {}) {
    const response = await fetch(url, options);
    if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.assign('/login');
        throw new Error('Session expired');
    }
    return response;
}
