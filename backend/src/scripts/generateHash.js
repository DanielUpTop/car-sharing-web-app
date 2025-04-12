const bcrypt = require('bcryptjs');

const password = 'adminpassword';
bcrypt.hash(password, 10).then(hash => {
    console.log('Generated hash for', password + ':');
    console.log(hash);
}); 