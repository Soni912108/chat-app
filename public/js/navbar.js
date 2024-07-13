const userName = sessionStorage.getItem('username');
const token = sessionStorage.getItem('token');
const userId = sessionStorage.getItem('userID');

const welcomeUser = document.getElementById('username');
//welcome user
if (welcomeUser){
  welcomeUser.textContent = 'Welcome, ' + userName;
} else {
  console.log('Element not found');
}



function gotoNotification() {
    if (!token) {
      sessionStorage.clear();
      window.location.href = '/login?message=loggedOut';
      return; // Exit the function if token is expired
    }
  
    window.location.href = '/notification';
}

  
  
function goToProfile() {
    if (!token) {
      sessionStorage.clear();
      window.location.href = '/login?message=loggedOut';
      return; // Exit the function if token is expired
    }
  
    window.location.href = '/profile';
  }
  


//logout the user and clear the session data
function logout() {
    sessionStorage.clear();
    window.location.href = '/login?message=loggedOut';
  }



function goBack(){
    window.location.href = '/dashboard'; // Redirect to the dashboard.html page
}
function updateUserProfile(){
    window.location.href = '/updateUser'; // Redirect to the updateUser.html page
}


function goBackToProfile(){
  window.location.href = '/profile'; // Redirect to the profile.html page
}