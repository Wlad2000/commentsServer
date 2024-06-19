const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const open = (path) => {
    return db = new sqlite3.Database(path, (err) => {
        if (err) {
            console.error("Error opening database: ", err);
        } else {
            console.log("Database opened successfully");
        }
    });
};

const control = (ws, mes) => {
    if (mes.action === 'addComment') {
        const { avatar, username, email, homepage , text, parent_id,file } = mes.data;
        db.run(
            `INSERT INTO comments (avatar, username, email, homepage,  text, file , parent_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [`/${email}/user-account.png`, username, email, homepage , text, `${file ? `/${email}/uploaded_${file.type ==='text' ?'text.txt':file.type ==='image'?'image.png': ''}` : ''}` , parent_id],
            function (err) {
                if (err) {
                    console.log('error with add ')
                    ws.send(JSON.stringify({ type: 'error', message: 'Failed to add comment' }));
                } else {
                    //add  folder user with avatar image
                    createFolder(email,avatar,file)
                    ws.send(JSON.stringify({ type: 'success', message: 'Comment added', id: this.lastID }));
                }
            }
        );
    } else if (mes.action === 'getComments') {
        const { sortField, sortOrder, page, perPage } = mes.data;
        const validSortFields = ['username', 'email', 'created_at'];
        const validSortOrder = ['ASC', 'DESC'];
    

        const orderBy = validSortFields.includes(sortField) ? sortField : 'username';
        const order = validSortOrder.includes(sortOrder) ? sortOrder : 'ASC';
    
        const offset = page * perPage;
    
        const query = `
            SELECT * FROM comments 
            WHERE parent_id IS NULL 
            ORDER BY ${orderBy} ${order} 
            LIMIT ? OFFSET ?`;
    
        db.all(query, [perPage, offset],(err, rows) => {
                if (err) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Failed to retrieve comments' }));
                } else {
                    ws.send(JSON.stringify({ type: 'comments', data: rows }));
                }
            }
        );
    } else if (mes.action === 'getReplies') {
        db.all(
            `SELECT * FROM comments WHERE parent_id IS NOT NULL ORDER BY created_at ASC`,
            (err, rows) => {
                if (err) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Failed to retrieve replies' }));
                } else {
                    ws.send(JSON.stringify({ type: 'replies', data: rows }));
                }
            }
        );
    }
};

function createFolder  (username,avatar,file)  {
    const uploadsPath = path.join(__dirname, './uploads');
    const userFolderPath = path.join(uploadsPath, username);
    const sourceFilePath = path.join(uploadsPath, 'user-account.png');
    const destinationFilePath = path.join(userFolderPath, 'user-account.png');
    if (!fs.existsSync(userFolderPath)) {
    fs.mkdirSync(userFolderPath);
    fs.copyFileSync(sourceFilePath, destinationFilePath);
      console.log(`folder ${username} create.`);
      // if have avatar, file data
      avatar && changeAvatar (username,avatar)
      file && uploadFile (username,file)
    } else {
      console.log(`folder ${username} already exist.`);
           // if have avatar, file  data
           avatar && changeAvatar (username,avatar)
           file && uploadFile (username,file)
    }
  };
  function changeAvatar (username,avatar){
    const UPLOADS_PATH = path.join(__dirname, `./uploads/${username}`);
    const IMAGE_FILE_NAME ='user-account.png';
    const currentFilePath = path.join(UPLOADS_PATH, IMAGE_FILE_NAME);
    if (fs.existsSync(currentFilePath)) {
        fs.unlinkSync(currentFilePath);
    }
    const newFilePath = path.join(UPLOADS_PATH, IMAGE_FILE_NAME);
    fs.writeFileSync(newFilePath, Buffer.from(avatar,'base64') );
  }
  function uploadFile(username, file) {
    const UPLOADS_PATH = path.join(__dirname, `./uploads/${username}`);
    if (!fs.existsSync(UPLOADS_PATH)) {
        fs.mkdirSync(UPLOADS_PATH, { recursive: true });
    }
    let fileName;
    let fileContent;

    if (file.type ==='image') {
        fileName = `uploaded_image.png`;
        fileContent = Buffer.from(file.content, 'base64');
    } else if (file.type ==='text') {
        fileName = 'uploaded_text.txt';
        fileContent = file.content;
    } else {
        throw new Error('Unsupported file type');
    }

    const currentFilePath = path.join(UPLOADS_PATH, fileName);
    if (fs.existsSync(currentFilePath)) {
        fs.unlinkSync(currentFilePath);
    }

    const newFilePath = path.join(UPLOADS_PATH, fileName);
    fs.writeFileSync(newFilePath, fileContent);
    return newFilePath;
}

module.exports = {
    open,
    control
};
