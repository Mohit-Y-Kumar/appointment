import bcrypt from 'bcrypt'

const password = process.argv[2]

if (!password) {
    console.error('Error: Please provide a password as an argument')
    console.error('Usage: node utils/generateAdminPasswordHash.js "your_password_here"')
    process.exit(1)
}

const saltRounds = 10

bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
        console.error('Error generating hash:', err.message)
        process.exit(1)
    }
    console.log('\n Admin password hash generated successfully!\n')
    console.log('Add this to your .env file:')
    console.log(`ADMIN_PASSWORD_HASH=${hash}\n`)
    console.log('  Keep this hash secure and never commit it to version control!')
    process.exit(0)
})
