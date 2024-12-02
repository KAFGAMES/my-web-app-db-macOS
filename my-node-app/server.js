const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { spawn } = require('child_process');
const path = require('path');
const app = express();
// 静的ファイルの提供
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.send('Hello World!');
});



//app.use(express.json());
//app.use(cors()); // 全てのオリジンからのリクエストを許可


app.use(express.json());
app.use(cors({
    origin: 'http://localhost:3000', // フロントエンドのURLに合わせてください
    credentials: true
}));

app.use(session({
    secret: 'your-secret-key', // 適切なシークレットキーに変更してください
    resave: false,
    saveUninitialized: false
}));

// ensureAuthenticated 関数をここに追加
function ensureAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
}

function getUserConnection(req) {
    if (!req.session || !req.session.userDatabase) {
        throw new Error('User not authenticated');
    }

    return mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '0515masa', // 適切なパスワードに変更してください
        database: req.session.userDatabase,
        port: '3306'
    });
}



(async () => {

    // 接続プールを作成
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '0515masa',  // パスワードはご自身の設定に合わせてください
        database: 'KAFGAMES',
        port: '3306',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

     // ユーザーテーブルの作成
     const createUsersTableQuery = `
     CREATE TABLE IF NOT EXISTS users (
         id INT AUTO_INCREMENT PRIMARY KEY,
         username VARCHAR(255) UNIQUE,
         password VARCHAR(255),
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
     );
     `;
     await pool.query(createUsersTableQuery);

// ユーザー登録API
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        const [existingUsers] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
        if (existingUsers.length > 0) {
            return res.json({ success: false, message: 'このユーザー名は既に使用されています。' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.execute('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
        const userId = result.insertId;

        // 新しいデータベースを作成
        const userDatabaseName = `user_${userId}`;
        //await pool.execute(`CREATE DATABASE ??`, [userDatabaseName]);
        const escapedDatabaseName = mysql.escapeId(userDatabaseName);
        await pool.execute(`CREATE DATABASE ${escapedDatabaseName}`);

        // ユーザーデータベースへの接続
        const userPool = mysql.createPool({
            host: 'localhost',
            user: 'root',
            password: '0515masa',
            database: userDatabaseName,
            port: '3306',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

         // テーブル作成クエリを配列で定義
         const createTablesQueries = [
            `CREATE TABLE IF NOT EXISTS calendar_data (
                date DATE NOT NULL,
                category VARCHAR(255) NOT NULL,
                profit DECIMAL(10, 2),
                expense DECIMAL(10, 2),
                memo TEXT,
                profit_details TEXT,
                expense_details TEXT,
                currency VARCHAR(10),
                PRIMARY KEY (date, category)
            )`,
            `CREATE TABLE IF NOT EXISTS monthly_goals (
                category VARCHAR(255) NOT NULL,
                year INT NOT NULL,
                month INT NOT NULL,
                goal_amount DECIMAL(10, 2),
                currency VARCHAR(10),
                PRIMARY KEY (category, year, month)
            )`,
            `CREATE TABLE IF NOT EXISTS category_memos (
                category VARCHAR(255) NOT NULL PRIMARY KEY,
                memo TEXT
            )`,
            `CREATE TABLE IF NOT EXISTS categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                position INT,
                currency VARCHAR(10)
            )`,
            `CREATE TABLE IF NOT EXISTS assets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                currency VARCHAR(10),
                initial_balance DECIMAL(10, 2),
                current_balance DECIMAL(10, 2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS favorites (
                id INT AUTO_INCREMENT PRIMARY KEY,
                date DATE NOT NULL,
                profit DECIMAL(10,2),
                expense DECIMAL(10,2),
                memo TEXT,
                category VARCHAR(255),
                title VARCHAR(255)
            )`
        ];

        
         // 'USE' コマンドを 'query' メソッドで実行
         await userPool.query(`USE ${userDatabaseName}`);

        // テーブル作成クエリを順番に実行
        for (const query of createTablesQueries) {
            await userPool.query(query);
        }

        res.json({ success: true, message: 'ユーザー登録が完了しました。' });
    } catch (error) {
        console.error('ユーザー登録に失敗しました:', error);
        res.status(500).json({ success: false, message: 'ユーザー登録に失敗しました。' });
    }
});

// ユーザーログインAPI
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const [users] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) {
            return res.json({ success: false, message: 'ユーザー名またはパスワードが間違っています。' });
        }

        const user = users[0];
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.json({ success: false, message: 'ユーザー名またはパスワードが間違っています。' });
        }

        // セッションにユーザー情報を保存
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.userDatabase = `user_${user.id}`;

        res.json({ success: true, message: 'ログインに成功しました。' });
    } catch (error) {
        console.error('ログインに失敗しました:', error);
        res.status(500).json({ success: false, message: 'ログインに失敗しました。' });
    }
});

app.get('/api/checkAuth', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({ isAuthenticated: true });
    } else {
        res.json({ isAuthenticated: false });
    }
});



    console.log('MySQLデータベースに接続しました！');

    app.post('/api/saveData', ensureAuthenticated, async (req, res) => {
        const { category, date, profit, expense, memo, profitDetails, expenseDetails, currency } = req.body;
        const query = 'INSERT INTO calendar_data (date, category, profit, expense, memo, profit_details, expense_details, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ' +
                      'ON DUPLICATE KEY UPDATE profit = VALUES(profit), expense = VALUES(expense), memo = VALUES(memo), profit_details = VALUES(profit_details), expense_details = VALUES(expense_details), currency = VALUES(currency)';
        try {
            const connection = await getUserConnection(req);
            await connection.execute(query, [date, category, profit, expense, memo, profitDetails, expenseDetails, currency]);
            await connection.end();
            res.json({ message: 'データが保存されました' });
        } catch (err) {
            console.error('データの保存に失敗しました:', err);
            res.status(500).json({ error: 'データの保存に失敗しました' });
        }
    });
    

    // 為替レートを取得するAPIエンドポイント
    app.get('/api/usd-jpy', (req, res) => {
        const pythonProcess = spawn('python3', ['fetch_exchange_rate.py']);

        let rateData = '';
        let errorData = '';

        pythonProcess.stdout.on('data', (data) => {
            rateData += data.toString();
            console.log('Pythonスクリプトの出力:', data.toString()); // デバッグ用
        });

        pythonProcess.stderr.on('data', (data) => {
            errorData += data.toString();
            console.error('Pythonスクリプトからのエラー:', data.toString());
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0 || !rateData) {
                console.error('Pythonスクリプトが異常終了しました。コード:', code);
                res.status(500).json({ error: '為替レートの取得に失敗しました。', details: errorData });
            } else {
                const rate = parseFloat(rateData.trim());
                if (isNaN(rate)) {
                    res.status(500).json({ error: '為替レートの解析に失敗しました。' });
                } else {
                    res.json({ rate });
                }
            }
        });
    });

    // // データを保存するAPI
    // app.post('/api/saveData', async (req, res) => {
    //     const { category, date, profit, expense, memo, profitDetails, expenseDetails, currency } = req.body;
    //     const query = 'INSERT INTO calendar_data (date, category, profit, expense, memo, profit_details, expense_details, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ' +
    //                   'ON DUPLICATE KEY UPDATE profit = VALUES(profit), expense = VALUES(expense), memo = VALUES(memo), profit_details = VALUES(profit_details), expense_details = VALUES(expense_details), currency = VALUES(currency)';
    //     try {
    //         await pool.execute(query, [date, category, profit, expense, memo, profitDetails, expenseDetails, currency]);
    //         res.json({ message: 'データが保存されました' });
    //     } catch (err) {
    //         console.error('データの保存に失敗しました:', err);
    //         res.status(500).json({ error: 'データの保存に失敗しました' });
    //     }
    // });

    // データを取得するAPI
    app.get('/api/getData', ensureAuthenticated, async (req, res) => {
        const { category, date } = req.query;
        const query = 'SELECT * FROM calendar_data WHERE category = ? AND date = ?';
        try {
            const connection = await getUserConnection(req);
            const [results] = await connection.execute(query, [category, date]);
            await connection.end();
            res.json(results[0] || null);
        } catch (err) {
            console.error('データの取得に失敗しました:', err);
            res.status(500).json({ error: 'データの取得に失敗しました' });
        }
    });

    // データの一部を削除するAPI
    app.post('/api/deleteData', ensureAuthenticated,async (req, res) => {
        const { category, date, fields } = req.body;

        if (!fields || fields.length === 0) {
            res.status(400).json({ error: '削除するフィールドが指定されていません' });
            return;
        }

        let setClause = fields.map(field => {
            if (field === 'profit' || field === 'expense') {
                return `${field} = 0`;
            } else {
                return `${field} = NULL`;
            }
        }).join(', ');

        const query = `UPDATE calendar_data SET ${setClause} WHERE category = ? AND date = ?`;

        try {
            const connection = await getUserConnection(req);
            await connection.execute(query, [category, date]);
            await connection.end();
            res.json({ message: 'データが削除されました' });
        } catch (err) {
            console.error('データの削除に失敗しました:', err);
            res.status(500).json({ error: 'データの削除に失敗しました' });
        }
    });

    // 目標金額を保存するAPI
    app.post('/api/saveGoal', ensureAuthenticated, async (req, res) => {
        const { category, year, month, goalAmount, currency } = req.body;
        const query = 'INSERT INTO monthly_goals (category, year, month, goal_amount, currency) VALUES (?, ?, ?, ?, ?) ' +
                      'ON DUPLICATE KEY UPDATE goal_amount = VALUES(goal_amount), currency = VALUES(currency)';
        try {
            const connection = await getUserConnection(req);
            await connection.execute(query, [category, year, month, goalAmount, currency]);
            await connection.end();
            res.json({ message: '目標金額が保存されました' });
        } catch (err) {
            console.error('目標金額の保存に失敗しました:', err);
            res.status(500).json({ error: '目標金額の保存に失敗しました' });
        }
    });

    // 目標金額を取得するAPI
    app.get('/api/getGoal', ensureAuthenticated, async (req, res) => {
        const { category, year, month } = req.query;
        const query = 'SELECT goal_amount, currency FROM monthly_goals WHERE category = ? AND year = ? AND month = ?';
        try {
            const connection = await getUserConnection(req);
            const [results] = await connection.execute(query, [category, year, month]);
            await connection.end();
            res.json(results[0] || null);
        } catch (err) {
            console.error('目標金額の取得に失敗しました:', err);
            res.status(500).json({ error: '目標金額の取得に失敗しました' });
        }
    });

    // 月間データを取得するAPI
    app.get('/api/getDataForMonth', ensureAuthenticated, async (req, res) => {
        const { category, year, month } = req.query;
        const query = 'SELECT * FROM calendar_data WHERE category = ? AND YEAR(date) = ? AND MONTH(date) = ?';
        try {
            const connection = await getUserConnection(req);
            const [results] = await connection.execute(query, [category, year, month]);
            await connection.end();
            res.json(results);
        } catch (err) {
            console.error('データの取得に失敗しました:', err);
            res.status(500).json({ error: 'データの取得に失敗しました' });
        }
    });

    // カテゴリメモを保存するAPI
    app.post('/api/saveCategoryMemo', ensureAuthenticated, async (req, res) => {
        const { category, memo } = req.body;
        const query = 'INSERT INTO category_memos (category, memo) VALUES (?, ?) ON DUPLICATE KEY UPDATE memo = VALUES(memo)';
        try {
            const connection = await getUserConnection(req);
            await connection.execute(query, [category, memo]);
            await connection.end();
            res.json({ message: 'カテゴリメモが保存されました' });
        } catch (err) {
            console.error('カテゴリメモの保存に失敗しました:', err);
            res.status(500).json({ error: 'カテゴリメモの保存に失敗しました' });
        }
    });

    // カテゴリメモを取得するAPI
    app.get('/api/getCategoryMemo', ensureAuthenticated, async (req, res) => {
        const { category } = req.query;
        const query = 'SELECT memo FROM category_memos WHERE category = ?';
        try {
            const connection = await getUserConnection(req);
            const [results] = await connection.execute(query, [category]);
            await connection.end();
            res.json({ memo: results[0]?.memo || '' });
        } catch (err) {
            console.error('カテゴリメモの取得に失敗しました:', err);
            res.status(500).json({ error: 'カテゴリメモの取得に失敗しました' });
        }
    });

    // カテゴリを取得するAPI
    app.get('/api/getCategories', ensureAuthenticated, async (req, res) => {
        const query = 'SELECT * FROM categories ORDER BY position';
        try {
            const connection = await getUserConnection(req);
            const [results] = await connection.execute(query);
            await connection.end();
            res.json(results);
        } catch (err) {
            console.error('カテゴリの取得に失敗しました:', err);
            res.status(500).json({ error: 'カテゴリの取得に失敗しました' });
        }
    });

    // カテゴリ名を更新するAPI（トランザクションを使用）
    app.post('/api/updateCategoryName', ensureAuthenticated, async (req, res) => {
        const { id, name } = req.body;

        const connection = await getUserConnection(req);
        try {
            // トランザクションの開始
            await connection.beginTransaction();

            // 古いカテゴリ名を取得
            const [categories] = await connection.execute('SELECT name FROM categories WHERE id = ?', [id]);
            const oldName = categories[0].name;

            // カテゴリ名を更新
            await connection.execute('UPDATE categories SET name = ? WHERE id = ?', [name, id]);

            // 関連するデータのカテゴリ名を更新
            await connection.execute('UPDATE calendar_data SET category = ? WHERE category = ?', [name, oldName]);
            await connection.execute('UPDATE monthly_goals SET category = ? WHERE category = ?', [name, oldName]);
            await connection.execute('UPDATE category_memos SET category = ? WHERE category = ?', [name, oldName]);

            // トランザクションのコミット
            await connection.commit();
            

            res.json({ message: 'カテゴリ名と関連データが更新されました' });
        } catch (err) {
            // エラーが発生した場合はロールバック
            await connection.rollback();
            console.error('カテゴリ名の更新に失敗しました:', err);
            res.status(500).json({ error: 'カテゴリ名の更新に失敗しました' });
        } finally {
            await connection.end();
        }
    });

    // カテゴリの通貨を更新するAPI
    app.post('/api/updateCategoryCurrency',ensureAuthenticated, async (req, res) => {
        const { id, currency } = req.body;
        const query = 'UPDATE categories SET currency = ? WHERE id = ?';
        try {
            const connection = await getUserConnection(req);
            await connection.execute(query, [currency, id]);
            await connection.end();
            res.json({ message: 'カテゴリの通貨が更新されました' });
        } catch (err) {
            console.error('カテゴリの通貨の更新に失敗しました:', err);
            res.status(500).json({ error: 'カテゴリの通貨の更新に失敗しました' });
        }
    });

    // カテゴリの順番を更新するAPI
    app.post('/api/updateCategoryOrder',ensureAuthenticated, async (req, res) => {
        const categories = req.body.categories; // [{id: 1, position: 1}, ...]
        const connection = await getUserConnection(req);
        try {
            //const connection = await getUserConnection(req);
            await connection.beginTransaction();

            for (const cat of categories) {
                const query = 'UPDATE categories SET position = ? WHERE id = ?';
                await connection.execute(query, [cat.position, cat.id]);
            }

            await connection.commit();
            
            res.json({ message: 'カテゴリの順番が更新されました' });
        } catch (err) {
            await connection.rollback();
            console.error('カテゴリの順番の更新に失敗しました:', err);
            res.status(500).json({ error: 'カテゴリの順番の更新に失敗しました' });
        } finally {
            await connection.end();
        }
    });

    // 新しいカテゴリを追加するAPI
    app.post('/api/addCategory',ensureAuthenticated, async (req, res) => {
        const { name, currency } = req.body;
        const getMaxPositionQuery = 'SELECT MAX(position) as maxPosition FROM categories';
        try {
            const connection = await getUserConnection(req);
            const [results] = await connection.execute(getMaxPositionQuery);
            const maxPosition = results[0].maxPosition || 0;
            const newPosition = maxPosition + 1;

            const insertQuery = 'INSERT INTO categories (name, position, currency) VALUES (?, ?, ?)';
            await connection.execute(insertQuery, [name, newPosition, currency]);
            await connection.end();

            res.json({ message: '新しいカテゴリが追加されました' });
        } catch (err) {
            console.error('カテゴリの追加に失敗しました:', err);
            res.status(500).json({ error: 'カテゴリの追加に失敗しました' });
        }
    });

    // カテゴリを削除するAPI
    app.post('/api/deleteCategory',ensureAuthenticated, async (req, res) => {
        const { id } = req.body;
        const query = 'DELETE FROM categories WHERE id = ?';
        try {
            const connection = await getUserConnection(req);
            await connection.execute(query, [id]);
            await connection.end();
            res.json({ message: 'カテゴリが削除されました' });
        } catch (err) {
            console.error('カテゴリの削除に失敗しました:', err);
            res.status(500).json({ error: 'カテゴリの削除に失敗しました' });
        }
    });

    // 資産を取得するAPI
app.get('/api/getAssets',ensureAuthenticated, async (req, res) => {
    const query = 'SELECT * FROM assets ORDER BY name';
    try {
        const connection = await getUserConnection(req);
        const [results] = await connection.execute(query);
        await connection.end();
        res.json(results);
    } catch (err) {
        console.error('資産の取得に失敗しました:', err);
        res.status(500).json({ error: '資産の取得に失敗しました' });
    }
});

// 新しい資産を追加するAPI
app.post('/api/addAsset', ensureAuthenticated,async (req, res) => {
    const { name, currency } = req.body;
    const query = 'INSERT INTO assets (name, currency) VALUES (?, ?)';
    try {
        const connection = await getUserConnection(req);
        await connection.execute(query, [name, currency]);
        await connection.end();
        res.json({ message: '新しい資産が追加されました' });
    } catch (err) {
        console.error('資産の追加に失敗しました:', err);
        res.status(500).json({ error: '資産の追加に失敗しました' });
    }
});

// 資産名を更新するAPI
app.post('/api/updateAssetName', ensureAuthenticated,async (req, res) => {
    const { id, name } = req.body;
    const query = 'UPDATE assets SET name = ? WHERE id = ?';
    try {
        const connection = await getUserConnection(req);
        await connection.execute(query, [name, id]);
        await connection.end();
        res.json({ message: '資産名が更新されました' });
    } catch (err) {
        console.error('資産名の更新に失敗しました:', err);
        res.status(500).json({ error: '資産名の更新に失敗しました' });
    }
});

// 資産の通貨を更新するAPI
app.post('/api/updateAssetCurrency', ensureAuthenticated,async (req, res) => {
    const { id, currency } = req.body;
    const query = 'UPDATE assets SET currency = ? WHERE id = ?';
    try {
        const connection = await getUserConnection(req);
        await connection.execute(query, [currency, id]);
        await connection.end();
        res.json({ message: '資産の通貨が更新されました' });
    } catch (err) {
        console.error('資産の通貨の更新に失敗しました:', err);
        res.status(500).json({ error: '資産の通貨の更新に失敗しました' });
    }
});

// 資産を削除するAPI
app.post('/api/deleteAsset', ensureAuthenticated,async (req, res) => {
    const { id } = req.body;
    const query = 'DELETE FROM assets WHERE id = ?';
    try {
        const connection = await getUserConnection(req);
        await connection.execute(query, [id]);
        await connection.end();
        res.json({ message: '資産が削除されました' });
    } catch (err) {
        console.error('資産の削除に失敗しました:', err);
        res.status(500).json({ error: '資産の削除に失敗しました' });
    }
});

app.post('/api/saveAssetAmount', ensureAuthenticated,async (req, res) => {
    const { id, amount } = req.body;
    const query = 'UPDATE assets SET current_balance = ? WHERE id = ?';
    try {
        const connection = await getUserConnection(req);
        await connection.execute(query, [amount, id]);
        await connection.end();
        res.json({ message: '資産金額が保存されました' });
    } catch (error) {
        console.error('資産金額の保存に失敗しました:', error);
        res.status(500).json({ error: '資産金額の保存に失敗しました' });
    }
});

// app.get('/api/getAssets', ensureAuthenticated, async (req, res) => {
//     const query = 'SELECT id, name, currency, initial_balance, current_balance, created_at FROM assets ORDER BY name';
//     try {
//         const connection = await getUserConnection(req);
//         const [results] = await connection.execute(query);
//         await connection.end();
//         res.json(results);
//     } catch (err) {
//         console.error('資産の取得に失敗しました:', err);
//         res.status(500).json({ error: '資産の取得に失敗しました' });
//     }
// });

// お気に入りデータを保存するAPI
app.post('/api/addFavorite', ensureAuthenticated,async (req, res) => {
    const { date, profit, expense, memo, category, title } = req.body;
    const query = 'INSERT INTO favorites (date, profit, expense, memo, category, title) VALUES (?, ?, ?, ?, ?, ?)';
    try {
        const connection = await getUserConnection(req);
        const [result] = await connection.execute(query, [date, profit, expense, memo, category, title]);
        await connection.end();
        res.json({ message: 'お気に入りが保存されました', id: result.insertId });
    } catch (err) {
        console.error('お気に入りの保存に失敗しました:', err);
        res.status(500).json({ error: 'お気に入りの保存に失敗しました' });
    }
});



// お気に入りデータを取得するAPI
app.get('/api/getFavorites', ensureAuthenticated,async (req, res) => {
    const query = 'SELECT * FROM favorites';
    try {
        const connection = await getUserConnection(req);
        const [results] = await connection.execute(query);
        await connection.end();
        res.json(results);
    } catch (err) {
        console.error('お気に入りデータの取得に失敗しました:', err);
        res.status(500).json({ error: 'お気に入りデータの取得に失敗しました' });
    }
});

// お気に入りを削除するAPI
app.post('/api/removeFavorite', ensureAuthenticated,async (req, res) => {
    const { id } = req.body;

    if (!id) {
        res.status(400).json({ error: '削除するお気に入りのIDが指定されていません' });
        return;
    }

    const query = 'DELETE FROM favorites WHERE id = ?';

    try {
        const connection = await getUserConnection(req);
        const [result] = await connection.execute(query, [id]);
        if (result.affectedRows === 0) {
            res.status(404).json({ error: '指定されたIDのお気に入りが見つかりませんでした' });
        } else {
            await connection.end();
            res.json({ message: 'お気に入りが削除されました' });
        }
    } catch (err) {
        console.error('お気に入りの削除に失敗しました:', err);
        res.status(500).json({ error: 'お気に入りの削除に失敗しました' });
    }
});




// 資産の更新API
app.post('/api/updateAssetAmount', ensureAuthenticated,async (req, res) => {
    const { assetId, amount } = req.body;

    if (!assetId || !amount) {
        return res.status(400).json({ success: false, message: '資産IDまたは金額が指定されていません。' });
    }

    try {
        const connection = await getUserConnection(req);
        // 資産の現在の値を取得
        const [assets] = await connection.execute('SELECT current_balance FROM assets WHERE id = ?', [assetId]);
        if (assets.length === 0) {
            return res.status(404).json({ success: false, message: '資産が見つかりません。' });
        }

        const currentBalance = parseFloat(assets[0].current_balance);
        const newBalance = currentBalance + parseFloat(amount);

        // 資産の値を更新
        await connection.execute('UPDATE assets SET current_balance = ? WHERE id = ?', [newBalance, assetId]);
        await connection.end();
        res.json({ success: true, newBalance });
    } catch (err) {
        console.error('資産の更新に失敗しました:', err);
        res.status(500).json({ success: false, message: '資産の更新に失敗しました。' });
    }
});





const PORT = 3000; // バックエンドサーバーのポート
app.listen(PORT, () => {
    console.log(`サーバーがポート${PORT}で起動しました`);
});

})();
