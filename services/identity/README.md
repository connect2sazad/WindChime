# Express App

## Commands


> |   Action     |    Command    |
> |--------------|---------------|
> |   **Generate Secret Key**    |   ```node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"```   |
> |   **Start Server**    |   ```npm run dev```   |
> |   **Tree View Folder**    |   ```npm run ls```   |
> |   **Create Migration**    |   ```npx sequelize-cli migration:generate --name migration-file-name-here-in-this-format```   |
> |   **Run Migration**    |   ```npx sequelize-cli db:migrate```   |
> |   **Create Seed**    |   ``` npx sequelize-cli seed:generate --name seeding-file-name-here-in-this-format```   |
> |   **Run Seeding**    |   ```npx sequelize-cli db:seed:all```   |


### Steps to follow after Migration file creation:
> - After running the migration command, please make sure that you have renamed the file extension from .js to .cjs
> - For Example:
> - After running command on CLI:
> ```npx sequelize-cli migration:generate --name create-users-table```
> - The above command will generate a file something like: *`migrations/20260918035038-create-users-table.js`*
> - Rename the file from <code>migrations/20260918035038-create-users-table<strong>.js</strong></code> to <code>migrations/20260918035038-create-users-table<strong>.cjs</strong></code>

# Backend

## Home
>|   Action |    Request Type    |   Link    |   Request Body    |
>|----------|--------------------|-----------|-------------------|
>|   **HOME**    |   ``GET``   |   http://127.0.0.1:3100/    |  None |

## Health
>|   Action |    Request Type    |   Link    |   Request Body    |
>|----------|--------------------|-----------|-------------------|
>|   **HEALTH**    |   ``GET``   |   http://127.0.0.1:3100/health/    |  None |
>|   **READINESS** |   ``GET``   |   http://127.0.0.1:3100/health/ready    |  None |


## Auth
>|   Action |    Request Type    |   Link    |   Request Body    |
>|----------|--------------------|-----------|-------------------|
>|   **LOGIN**    |   ``POST``   |   http://127.0.0.1:3100/api/v1/auth/login    |  [JSON](#login) |
>|   **LOGOUT**    |   ``POST``   |   http://127.0.0.1:3100/api/v1/auth/logout    |  None |
>|   **REGISTER**    |   ``POST``    |   http://127.0.0.1:3100/api/v1/auth/register    |  [JSON](#register-user) |



## User
>|   Action |    Request Type    |   Link    |   Request Body    |
>|----------|--------------------|-----------|-------------------|
>|   **LIST**    |   ``GET``    |   http://127.0.0.1:3100/api/v1/users    |  None |
>|   **VIEW**    |   ``GET``   |   http://127.0.0.1:3100/api/v1/users/4    |  None |


# JSON:
## Register User
```
{
    "name": "Tester",
    "username": "tester",
    "email": "tester@example.com",
    "password": "Password@123456789",
    "confirm_password": "Password@123456789",
}
```
## Login
```
{
    "userid": "tester",
    "password": "Password@123456789"
}
```


> ### MD Guide:
> https://www.markdownguide.org/basic-syntax/