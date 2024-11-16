const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const app = express();

app.use(express.json());
app.use(cors()); // 全てのオリジンからのリクエストを許可

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

    console.log('MySQLデータベースに接続しました！');

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

    // データを保存するAPI
    app.post('/api/saveData', async (req, res) => {
        const { category, date, profit, expense, memo, profitDetails, expenseDetails, currency } = req.body;
        const query = 'INSERT INTO calendar_data (date, category, profit, expense, memo, profit_details, expense_details, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ' +
                      'ON DUPLICATE KEY UPDATE profit = VALUES(profit), expense = VALUES(expense), memo = VALUES(memo), profit_details = VALUES(profit_details), expense_details = VALUES(expense_details), currency = VALUES(currency)';
        try {
            await pool.execute(query, [date, category, profit, expense, memo, profitDetails, expenseDetails, currency]);
            res.json({ message: 'データが保存されました' });
        } catch (err) {
            console.error('データの保存に失敗しました:', err);
            res.status(500).json({ error: 'データの保存に失敗しました' });
        }
    });

    // データを取得するAPI
    app.get('/api/getData', async (req, res) => {
        const { category, date } = req.query;
        const query = 'SELECT * FROM calendar_data WHERE category = ? AND date = ?';
        try {
            const [results] = await pool.execute(query, [category, date]);
            res.json(results[0] || null);
        } catch (err) {
            console.error('データの取得に失敗しました:', err);
            res.status(500).json({ error: 'データの取得に失敗しました' });
        }
    });

    // データの一部を削除するAPI
    app.post('/api/deleteData', async (req, res) => {
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
            await pool.execute(query, [category, date]);
            res.json({ message: 'データが削除されました' });
        } catch (err) {
            console.error('データの削除に失敗しました:', err);
            res.status(500).json({ error: 'データの削除に失敗しました' });
        }
    });

    // 目標金額を保存するAPI
    app.post('/api/saveGoal', async (req, res) => {
        const { category, year, month, goalAmount, currency } = req.body;
        const query = 'INSERT INTO monthly_goals (category, year, month, goal_amount, currency) VALUES (?, ?, ?, ?, ?) ' +
                      'ON DUPLICATE KEY UPDATE goal_amount = VALUES(goal_amount), currency = VALUES(currency)';
        try {
            await pool.execute(query, [category, year, month, goalAmount, currency]);
            res.json({ message: '目標金額が保存されました' });
        } catch (err) {
            console.error('目標金額の保存に失敗しました:', err);
            res.status(500).json({ error: '目標金額の保存に失敗しました' });
        }
    });

    // 目標金額を取得するAPI
    app.get('/api/getGoal', async (req, res) => {
        const { category, year, month } = req.query;
        const query = 'SELECT goal_amount, currency FROM monthly_goals WHERE category = ? AND year = ? AND month = ?';
        try {
            const [results] = await pool.execute(query, [category, year, month]);
            res.json(results[0] || null);
        } catch (err) {
            console.error('目標金額の取得に失敗しました:', err);
            res.status(500).json({ error: '目標金額の取得に失敗しました' });
        }
    });

    // 月間データを取得するAPI
    app.get('/api/getDataForMonth', async (req, res) => {
        const { category, year, month } = req.query;
        const query = 'SELECT * FROM calendar_data WHERE category = ? AND YEAR(date) = ? AND MONTH(date) = ?';
        try {
            const [results] = await pool.execute(query, [category, year, month]);
            res.json(results);
        } catch (err) {
            console.error('データの取得に失敗しました:', err);
            res.status(500).json({ error: 'データの取得に失敗しました' });
        }
    });

    // カテゴリメモを保存するAPI
    app.post('/api/saveCategoryMemo', async (req, res) => {
        const { category, memo } = req.body;
        const query = 'INSERT INTO category_memos (category, memo) VALUES (?, ?) ON DUPLICATE KEY UPDATE memo = VALUES(memo)';
        try {
            await pool.execute(query, [category, memo]);
            res.json({ message: 'カテゴリメモが保存されました' });
        } catch (err) {
            console.error('カテゴリメモの保存に失敗しました:', err);
            res.status(500).json({ error: 'カテゴリメモの保存に失敗しました' });
        }
    });

    // カテゴリメモを取得するAPI
    app.get('/api/getCategoryMemo', async (req, res) => {
        const { category } = req.query;
        const query = 'SELECT memo FROM category_memos WHERE category = ?';
        try {
            const [results] = await pool.execute(query, [category]);
            res.json({ memo: results[0]?.memo || '' });
        } catch (err) {
            console.error('カテゴリメモの取得に失敗しました:', err);
            res.status(500).json({ error: 'カテゴリメモの取得に失敗しました' });
        }
    });

    // カテゴリを取得するAPI
    app.get('/api/getCategories', async (req, res) => {
        const query = 'SELECT * FROM categories ORDER BY position';
        try {
            const [results] = await pool.execute(query);
            res.json(results);
        } catch (err) {
            console.error('カテゴリの取得に失敗しました:', err);
            res.status(500).json({ error: 'カテゴリの取得に失敗しました' });
        }
    });

    // カテゴリ名を更新するAPI（トランザクションを使用）
    app.post('/api/updateCategoryName', async (req, res) => {
        const { id, name } = req.body;

        const connection = await pool.getConnection();
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
            connection.release();
        }
    });

    // カテゴリの通貨を更新するAPI
    app.post('/api/updateCategoryCurrency', async (req, res) => {
        const { id, currency } = req.body;
        const query = 'UPDATE categories SET currency = ? WHERE id = ?';
        try {
            await pool.execute(query, [currency, id]);
            res.json({ message: 'カテゴリの通貨が更新されました' });
        } catch (err) {
            console.error('カテゴリの通貨の更新に失敗しました:', err);
            res.status(500).json({ error: 'カテゴリの通貨の更新に失敗しました' });
        }
    });

    // カテゴリの順番を更新するAPI
    app.post('/api/updateCategoryOrder', async (req, res) => {
        const categories = req.body.categories; // [{id: 1, position: 1}, ...]
        const connection = await pool.getConnection();
        try {
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
            connection.release();
        }
    });

    // 新しいカテゴリを追加するAPI
    app.post('/api/addCategory', async (req, res) => {
        const { name, currency } = req.body;
        const getMaxPositionQuery = 'SELECT MAX(position) as maxPosition FROM categories';
        try {
            const [results] = await pool.execute(getMaxPositionQuery);
            const maxPosition = results[0].maxPosition || 0;
            const newPosition = maxPosition + 1;

            const insertQuery = 'INSERT INTO categories (name, position, currency) VALUES (?, ?, ?)';
            await pool.execute(insertQuery, [name, newPosition, currency]);

            res.json({ message: '新しいカテゴリが追加されました' });
        } catch (err) {
            console.error('カテゴリの追加に失敗しました:', err);
            res.status(500).json({ error: 'カテゴリの追加に失敗しました' });
        }
    });

    // カテゴリを削除するAPI
    app.post('/api/deleteCategory', async (req, res) => {
        const { id } = req.body;
        const query = 'DELETE FROM categories WHERE id = ?';
        try {
            await pool.execute(query, [id]);
            res.json({ message: 'カテゴリが削除されました' });
        } catch (err) {
            console.error('カテゴリの削除に失敗しました:', err);
            res.status(500).json({ error: 'カテゴリの削除に失敗しました' });
        }
    });

    // 資産を取得するAPI
app.get('/api/getAssets', async (req, res) => {
    const query = 'SELECT * FROM assets ORDER BY name';
    try {
        const [results] = await pool.execute(query);
        res.json(results);
    } catch (err) {
        console.error('資産の取得に失敗しました:', err);
        res.status(500).json({ error: '資産の取得に失敗しました' });
    }
});

// 新しい資産を追加するAPI
app.post('/api/addAsset', async (req, res) => {
    const { name, currency } = req.body;
    const query = 'INSERT INTO assets (name, currency) VALUES (?, ?)';
    try {
        await pool.execute(query, [name, currency]);
        res.json({ message: '新しい資産が追加されました' });
    } catch (err) {
        console.error('資産の追加に失敗しました:', err);
        res.status(500).json({ error: '資産の追加に失敗しました' });
    }
});

// 資産名を更新するAPI
app.post('/api/updateAssetName', async (req, res) => {
    const { id, name } = req.body;
    const query = 'UPDATE assets SET name = ? WHERE id = ?';
    try {
        await pool.execute(query, [name, id]);
        res.json({ message: '資産名が更新されました' });
    } catch (err) {
        console.error('資産名の更新に失敗しました:', err);
        res.status(500).json({ error: '資産名の更新に失敗しました' });
    }
});

// 資産の通貨を更新するAPI
app.post('/api/updateAssetCurrency', async (req, res) => {
    const { id, currency } = req.body;
    const query = 'UPDATE assets SET currency = ? WHERE id = ?';
    try {
        await pool.execute(query, [currency, id]);
        res.json({ message: '資産の通貨が更新されました' });
    } catch (err) {
        console.error('資産の通貨の更新に失敗しました:', err);
        res.status(500).json({ error: '資産の通貨の更新に失敗しました' });
    }
});

// 資産を削除するAPI
app.post('/api/deleteAsset', async (req, res) => {
    const { id } = req.body;
    const query = 'DELETE FROM assets WHERE id = ?';
    try {
        await pool.execute(query, [id]);
        res.json({ message: '資産が削除されました' });
    } catch (err) {
        console.error('資産の削除に失敗しました:', err);
        res.status(500).json({ error: '資産の削除に失敗しました' });
    }
});

app.post('/api/saveAssetAmount', async (req, res) => {
    const { id, amount } = req.body;
    const query = 'UPDATE assets SET current_balance = ? WHERE id = ?';
    try {
        await pool.execute(query, [amount, id]);
        res.json({ message: '資産金額が保存されました' });
    } catch (error) {
        console.error('資産金額の保存に失敗しました:', error);
        res.status(500).json({ error: '資産金額の保存に失敗しました' });
    }
});

app.get('/api/getAssets', async (req, res) => {
    const query = 'SELECT id, name, currency, initial_balance, current_balance, created_at FROM assets ORDER BY name';
    try {
        const [results] = await pool.execute(query);
        res.json(results);
    } catch (err) {
        console.error('資産の取得に失敗しました:', err);
        res.status(500).json({ error: '資産の取得に失敗しました' });
    }
});

// お気に入りデータを保存するAPI
app.post('/api/addFavorite', async (req, res) => {
    const { date, profit, expense, memo, category, title } = req.body; // 'title'を追加
    const query = 'INSERT INTO favorites (date, profit, expense, memo, category, title) VALUES (?, ?, ?, ?, ?, ?) ' +
                  'ON DUPLICATE KEY UPDATE profit = VALUES(profit), expense = VALUES(expense), memo = VALUES(memo), category = VALUES(category), title = VALUES(title)';
    try {
        await pool.execute(query, [date, profit, expense, memo, category, title]);
        res.json({ message: 'お気に入りが保存されました' });
    } catch (err) {
        console.error('お気に入りの保存に失敗しました:', err);
        res.status(500).json({ error: 'お気に入りの保存に失敗しました' });
    }
});


// お気に入りデータを取得するAPI
app.get('/api/getFavorites', async (req, res) => {
    const query = 'SELECT * FROM favorites';
    try {
        const [results] = await pool.execute(query);
        res.json(results);
    } catch (err) {
        console.error('お気に入りデータの取得に失敗しました:', err);
        res.status(500).json({ error: 'お気に入りデータの取得に失敗しました' });
    }
});


// 資産の更新API
app.post('/api/updateAssetAmount', async (req, res) => {
    const { assetId, amount } = req.body;

    if (!assetId || !amount) {
        return res.status(400).json({ success: false, message: '資産IDまたは金額が指定されていません。' });
    }

    try {
        // 資産の現在の値を取得
        const [assets] = await pool.execute('SELECT current_balance FROM assets WHERE id = ?', [assetId]);
        if (assets.length === 0) {
            return res.status(404).json({ success: false, message: '資産が見つかりません。' });
        }

        const currentBalance = parseFloat(assets[0].current_balance);
        const newBalance = currentBalance + parseFloat(amount);

        // 資産の値を更新
        await pool.execute('UPDATE assets SET current_balance = ? WHERE id = ?', [newBalance, assetId]);
        res.json({ success: true, newBalance });
    } catch (err) {
        console.error('資産の更新に失敗しました:', err);
        res.status(500).json({ success: false, message: '資産の更新に失敗しました。' });
    }
});





    // サーバーの起動
    app.listen(3000, () => {
        console.log('サーバーがポート3000で起動しました');
    });
})();
