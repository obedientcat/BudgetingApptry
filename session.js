// Save data
localStorage.setItem('username', 'JohnDoe');

// Get data on page load
const username = localStorage.getItem('username');
if (username) {
  // Use the saved data
  console.log(`Welcome back, ${username}`);
}
