// app.js

// グローバル変数の初期化（DOMに依存しないもの）
let currentDate = new Date();
let selectedDate = null;
let goalChart = null;
let currentCategory = ''; // デフォルトのカテゴリ
let profitDetails = [];
let expenseDetails = [];
let categoriesList = [];
let categoryCurrencies = {}; // カテゴリごとの通貨設定を保持
let assetsList = []; // 資産のリストを保持

document.addEventListener('DOMContentLoaded', async function() {

    // 初期化で現在の日付を選択状態にする
    // selectedDateの初期化
    const today = new Date();
    selectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    try {

        await loadAssets(); // 資産をロード
        // 初期化関数の呼び出し
        await initializeDisplay(); // 為替レートの取得と表示の初期化
        await　loadCategories(); // カテゴリの読み込み


        // currentCategory の値に応じて適切な関数を呼び出す
        if (currentCategory === 'total') {
            renderCalendarWithTotal();
            calculateTotalGoalAndUpdateChart();
        } else {
            renderCalendar(currentDate);
            calculateMonthlyBalance(currentDate.getFullYear(), currentDate.getMonth());
        }


        selectToday(); // 今日の日付の選択
        displayGoalAmount(); // 目標金額の表示

        // 初期状態でデータをロード
        loadDataForSelectedDate(); // selectedDateに基づきデータをロード
        
    } catch (error) {
        console.error("初期化中にエラーが発生しました:", error);
    }
    // DOM要素の取得

    // // ページロード時に初期選択状態のデータを反映する
    // if (selectedDate) {
    //     loadDataForSelectedDate(); // 既存のデータロード関数を呼び出して初期状態を反映
    // } else {
    //     // 初期選択状態で日付がない場合に現在日付を設定してロードする
    //     const today = new Date();
    //     selectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    //     loadDataForSelectedDate();
    // }

    const calendarBody = document.getElementById('calendar-body');
    const monthYear = document.getElementById('month-year');
    const prevMonthButton = document.getElementById('prev-month');
    const nextMonthButton = document.getElementById('next-month');
    const profitInput = document.getElementById('profit-input');
    const expenseInput = document.getElementById('expense-input');
    const saveButton = document.getElementById('save-btn');
    const memoInput = document.getElementById('memo-input');
    const memoSaveButton = document.getElementById('memo-save-btn');
    const monthlyBalanceDiv = document.getElementById('monthly-balance');

    // Initial setup for displaying JPY in the input fields and balance
    profitInput.value = `${profitInput.value || 0} JPY`;
    expenseInput.value = `${expenseInput.value || 0} JPY`;
    //monthlyBalanceDiv.textContent = `月間損益: ${monthlyBalanceDiv.textContent || 0} JPY`;

    // document.getElementById('add-favorite-btn').addEventListener('click', addFavoriteFunction);

    const goalInput = document.getElementById('goal-input');
    const goalSaveButton = document.getElementById('goal-save-btn');
    const goalChartCanvas = document.getElementById('goal-chart');
    const goalDisplay = document.getElementById('goal-display');
    const diaryLedgerButton = document.getElementById('diary-ledger-btn');
    const deleteProfitButton = document.getElementById('delete-profit-btn');
    const deleteExpenseButton = document.getElementById('delete-expense-btn');
    const deleteMemoButton = document.getElementById('delete-memo-btn');
    const memoMenuButton = document.getElementById('memo-menu-btn');
    const addProfitDetailButton = document.getElementById('add-profit-detail-btn');
    const addExpenseDetailButton = document.getElementById('add-expense-detail-btn');
    const profitDetailModal = document.getElementById('profit-detail-modal');
    const expenseDetailModal = document.getElementById('expense-detail-modal');
    const categorySelect = document.getElementById('category-select');

    

    // Fetch the currency exchange rate (assuming it's already obtained once daily and available in `usdToJpyRate`)
    let usdToJpyRate = 0; // Placeholder, to be set from fetched data
    async function fetchExchangeRate() {
        try {
            const response = await fetch('http://localhost:3000/api/usd-jpy');
            const data = await response.json();
            usdToJpyRate = data.rate || 1; // Default to 1 if the rate is not available
            //updateDisplayedAmounts(); // 為替レート取得後に初期表示を設定
        } catch (error) {
            console.error('Error fetching exchange rate:', error);
        }
    }
    await fetchExchangeRate(); // 為替レートを取得してから次の処理へ



    // Initial display of JPY in input fields and balance
    updateDisplayedAmounts();

    // Helper function to convert amounts based on selected currency
    // 修正後の convertAmount 関数
function convertAmount(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) {
        return amount;
    }
    if (fromCurrency === 'JPY' && toCurrency === 'USD' && usdToJpyRate) {
        return amount / usdToJpyRate; // JPYからUSDへの変換
    } else if (fromCurrency === 'USD' && toCurrency === 'JPY' && usdToJpyRate) {
        return amount * usdToJpyRate; // USDからJPYへの変換
    }
    return amount; // 通貨情報やレートがない場合は元の金額を返す
}


    // Update displayed amounts based on currency selection
    function updateDisplayedAmounts() {
        const selectedCurrency = categoryCurrencies[currentCategory] || 'JPY';

        // Update profit and expense display
        const profitAmount = parseFloat(profitInput.value.replace(/[^0-9.-]/g, '')) || 0;
        const expenseAmount = parseFloat(expenseInput.value.replace(/[^0-9.-]/g, '')) || 0;

        // profitInput.value = `${profitAmount} ${selectedCurrency}`;
        // expenseInput.value = `${expenseAmount} ${selectedCurrency}`;
        profitInput.value = `${profitAmount}`;
        expenseInput.value = `${expenseAmount}`;

        // Update monthly balance display
        const balance = parseFloat(monthlyBalanceDiv.textContent.replace(/[^0-9.-]/g, '')) || 0;
        monthlyBalanceDiv.textContent = `月間損益: ${balance} ${selectedCurrency}`;
    }

    // ドル円レートを取得して表示
    async function fetchUsdJpyRate() {
        try {
            const response = await fetch(`http://localhost:3000/api/usd-jpy?timestamp=${new Date().getTime()}`);
            const data = await response.json();

            if (data.rate) {
                const rateDisplay = document.getElementById('usd-jpy-rate');
                rateDisplay.textContent = `ドル円: ${data.rate}円`;
            } else {
                console.error('為替レートが取得できませんでした');
            }
        } catch (error) {
            console.error('為替レートの取得中にエラーが発生しました:', error);
        }
    }

    // `preload`クラスを削除してページを表示
    document.body.classList.remove('preload');

    // 10秒ごとに為替レートを更新
    // setInterval(fetchUsdJpyRate, 10000);
    fetchUsdJpyRate();

    // 「日記家計簿」ボタンのクリックイベント
    diaryLedgerButton.addEventListener('click', () => {
        document.getElementById('memo-page').style.display = 'none';
        document.getElementById('category-management-page').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
    });

    document.getElementById('add-favorite-btn').addEventListener('click', addFavorite);

    // お気に入りページを開くボタンのイベントリスナー
document.getElementById('favorite-menu-btn').addEventListener('click', () => {
    document.getElementById('main-content').style.display = 'none';
    document.getElementById('memo-page').style.display = 'none';
    document.getElementById('category-management-page').style.display = 'none';
    document.getElementById('asset-management-page').style.display = 'none';
    document.getElementById('favorite-page').style.display = 'block';
    loadFavorites(); // お気に入りリストを読み込む
});

// お気に入りページの戻るボタンのイベントリスナー
document.getElementById('favorite-back-btn').addEventListener('click', () => {
    document.getElementById('favorite-page').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
});


    // カテゴリ管理ページを開くボタンのイベントリスナー
    document.getElementById('category-management-btn').addEventListener('click', showCategoryManagementPage);

    // カテゴリ管理ページの戻るボタンのイベントリスナー
    document.getElementById('category-management-back-btn').addEventListener('click', () => {
        document.getElementById('category-management-page').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
    });

    // 新しいカテゴリを追加するボタンのイベントリスナー
    document.getElementById('add-category-btn').addEventListener('click', () => {
        const newCategoryName = prompt('新しいカテゴリ名を入力してください:');
        if (newCategoryName) {
            const currency = confirm('このカテゴリはドルで管理しますか？\n「OK」をクリックするとドル、「キャンセル」をクリックすると円になります。') ? 'USD' : 'JPY';
            fetch('http://localhost:3000/api/addCategory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newCategoryName, currency })
            })
                .then(response => response.json())
                .then(() => {
                    loadCategories();
                })
                .catch(error => {
                    console.error('新しいカテゴリの追加に失敗しました:', error);
                });
        }
    });

    // カテゴリ管理ページを開くボタンのイベントリスナー
document.getElementById('category-management-btn').addEventListener('click', () => {
    document.getElementById('main-content').style.display = 'none';
    document.getElementById('memo-page').style.display = 'none';
    document.getElementById('asset-management-page').style.display = 'none'; // 資産管理ページを非表示
    document.getElementById('category-management-page').style.display = 'block'; // カテゴリ管理ページを表示
    document.getElementById('favorite-page').style.display = 'none';
});

// 資産管理ページを開くボタンのイベントリスナー
document.getElementById('asset-management-btn').addEventListener('click', () => {
    document.getElementById('main-content').style.display = 'none';
    document.getElementById('memo-page').style.display = 'none';
    document.getElementById('category-management-page').style.display = 'none'; // カテゴリ管理ページを非表示
    document.getElementById('asset-management-page').style.display = 'block'; // 資産管理ページを表示
    document.getElementById('favorite-page').style.display = 'none';
});

// メモページを開くボタンのイベントリスナー
document.getElementById('memo-menu-btn').addEventListener('click', () => {
    document.getElementById('main-content').style.display = 'none';
    document.getElementById('category-management-page').style.display = 'none';
    document.getElementById('asset-management-page').style.display = 'none';
    document.getElementById('memo-page').style.display = 'block'; // メモページを表示
    document.getElementById('favorite-page').style.display = 'none';
});



    // モーダルの開閉
    function openModal(modal) {
        modal.style.display = 'block';
    }

    function closeModal(modal) {
        modal.style.display = 'none';
    }

    addProfitDetailButton.addEventListener('click', () => {
        openModal(profitDetailModal);
    });

    addExpenseDetailButton.addEventListener('click', () => {
        openModal(expenseDetailModal);
    });

    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeModal(closeBtn.parentElement.parentElement);
        });
    });

    // メモボタンのクリックイベント
    memoMenuButton.addEventListener('click', () => {
        showMemoPage();
    });

    // 戻るボタンのイベントリスナー
    document.getElementById('category-memo-back-btn').addEventListener('click', () => {
        document.getElementById('memo-page').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
    });

    // カテゴリや日付が変更されたときの処理
    categorySelect.addEventListener('change', function() {
        currentCategory = this.value;

    //     // カレンダーを再描画
    // renderCalendar(currentDate, () => {
    //     // カレンダー再描画後に選択状態を再設定
    //     const selectedCell = document.querySelector(`[data-date="${selectedDate}"]`);
    //     if (selectedCell) {
    //         selectedCell.classList.add('selected');
    //         selectedCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
    //     }
    // });

    if (currentCategory === 'total') {
        // 合計カテゴリーの場合
        renderCalendarWithTotal();
        calculateTotalGoalAndUpdateChart();
        displayGoalAmount();
        updateDisplayedAmounts();

        // 入力フィールドを無効化
        disableInputFields();
    } else {
        // 他のカテゴリーの場合
        renderCalendar(currentDate, () => {
            const selectedCell = document.querySelector(`[data-date="${selectedDate}"]`);
            if (selectedCell) {
                selectedCell.classList.add('selected');
                selectedCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
        calculateMonthlyBalance(currentDate.getFullYear(), currentDate.getMonth());
        displayGoalAmount();
        updateDisplayedAmounts();

        // 入力フィールドを有効化
        enableInputFields();
    }




        if (currentCategory === '') {
            // カテゴリが選択されていない場合、入力を無効化
            resetInputFields();
            monthlyBalanceDiv.textContent = '月間損益: 0';
        } else if (currentCategory === 'total') {
            profitInput.disabled = true;
            expenseInput.disabled = true;
            saveButton.disabled = true;
            goalInput.disabled = true;
            goalSaveButton.disabled = true;
            memoInput.disabled = true;
            memoSaveButton.disabled = true;
            addProfitDetailButton.disabled = true;
            addExpenseDetailButton.disabled = true;

            profitInput.value = '';
            expenseInput.value = '';
            memoInput.value = '';
            profitDetails = [];
            expenseDetails = [];
            updateProfitDetailsList();
            updateExpenseDetailsList();

            renderCalendarWithTotal();
            calculateTotalGoalAndUpdateChart();
            displayGoalAmount();
            updateDisplayedAmounts();
        } else {
            profitInput.disabled = false;
            expenseInput.disabled = false;
            saveButton.disabled = false;
            goalInput.disabled = false;
            goalSaveButton.disabled = false;
            memoInput.disabled = false;
            memoSaveButton.disabled = false;
            addProfitDetailButton.disabled = false;
            addExpenseDetailButton.disabled = false;

            loadDataForSelectedDate();

            // currentCategory に応じてカレンダーを再描画
        if (currentCategory === 'total') {
            renderCalendarWithTotal();
            calculateTotalGoalAndUpdateChart();
        } else {
            //renderCalendar(currentDate);
            calculateMonthlyBalance(currentDate.getFullYear(), currentDate.getMonth());
        }


            // renderCalendar(currentDate);
           // calculateMonthlyBalance(currentDate.getFullYear(), currentDate.getMonth());
            displayGoalAmount();
            updateDisplayedAmounts();
        }

        if (document.getElementById('memo-page').style.display === 'block') {
            const categoryName = categorySelect.options[categorySelect.selectedIndex].text;
            document.getElementById('memo-category-name').textContent = categoryName;
            loadCategoryMemo();
        }
    });

    // 前月・翌月ボタンのイベントリスナー
    prevMonthButton.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        if (currentCategory === 'total') {
            renderCalendarWithTotal();
            calculateTotalGoalAndUpdateChart();
        } else {
            renderCalendar(currentDate);
            calculateMonthlyBalance(currentDate.getFullYear(), currentDate.getMonth());
        }
        displayGoalAmount();
    });

    nextMonthButton.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        if (currentCategory === 'total') {
            renderCalendarWithTotal();
            calculateTotalGoalAndUpdateChart();
        } else {
            renderCalendar(currentDate);
            calculateMonthlyBalance(currentDate.getFullYear(), currentDate.getMonth());
        }
        displayGoalAmount();
    });

    // 利益・支出の保存
    saveButton.addEventListener('click', () => {

        if (!selectedDate) {
            alert('日付を選択してください。');
            return;
        }

        if (selectedDate) {
            saveDataWithAsset(); // 資産更新を含む保存処理を実行
            const selectedCurrency = categoryCurrencies[currentCategory] || 'JPY';
            const profit = parseFloat(profitInput.value.replace(/[^0-9.-]/g, '')) || 0;
            const expense = parseFloat(expenseInput.value.replace(/[^0-9.-]/g, '')) || 0;
            const memo = memoInput.value || "";
            const profitDetailsStr = JSON.stringify(profitDetails);
            const expenseDetailsStr = JSON.stringify(expenseDetails);
            saveDataToDatabase(currentCategory, selectedDate, profit, expense, memo, profitDetailsStr, expenseDetailsStr, selectedCurrency, () => {
                renderCalendar(currentDate);
                const selectedCell = document.querySelector(`[data-date="${selectedDate}"]`);
                if (selectedCell) {
                    selectedCell.classList.add('selected');
                }
            });
        }
    });

    // メモの保存
    memoSaveButton.addEventListener('click', () => {
        if (selectedDate) {
            const selectedCurrency = categoryCurrencies[currentCategory] || 'JPY';
            const profit = parseFloat(profitInput.value.replace(/[^0-9.-]/g, '')) || 0;
            const expense = parseFloat(expenseInput.value.replace(/[^0-9.-]/g, '')) || 0;
            const memo = memoInput.value || "";
            const profitDetailsStr = JSON.stringify(profitDetails);
            const expenseDetailsStr = JSON.stringify(expenseDetails);
            saveDataToDatabase(currentCategory, selectedDate, profit, expense, memo, profitDetailsStr, expenseDetailsStr, selectedCurrency, () => {
                renderCalendar(currentDate);
                const selectedCell = document.querySelector(`[data-date="${selectedDate}"]`);
                if (selectedCell) {
                    selectedCell.classList.add('selected');
                }
            });
        }
    });

    // 利益の詳細を保存
    document.getElementById('save-profit-detail-btn').addEventListener('click', () => {
        const amount = parseFloat(document.getElementById('profit-detail-amount').value) || 0;
        const description = document.getElementById('profit-detail-description').value;

        profitDetails.push({ amount, description });
        updateProfitDetailsList();
        updateTotalProfit();
        closeModal(document.getElementById('profit-detail-modal'));
        document.getElementById('profit-detail-amount').value = '';
        document.getElementById('profit-detail-description').value = '';
    });

    // 支出の詳細を保存
    document.getElementById('save-expense-detail-btn').addEventListener('click', () => {
        const amount = parseFloat(document.getElementById('expense-detail-amount').value) || 0;
        const description = document.getElementById('expense-detail-description').value;

        expenseDetails.push({ amount, description });
        updateExpenseDetailsList();
        updateTotalExpense();
        closeModal(document.getElementById('expense-detail-modal'));
        document.getElementById('expense-detail-amount').value = '';
        document.getElementById('expense-detail-description').value = '';
    });

    let originalProfit = 0; // 元の利益を保持する変数
    let originalExpense = 0; // 元の支出を保持する変数

    


    // 削除ボタンのイベントリスナーを追加
    deleteProfitButton.addEventListener('click', () => {

        
        if (selectedDate && currentCategory !== 'total') {

            // 削除する利益の金額を取得
            const profitAmount = parseFloat(profitInput.value.replace(/[^0-9.-]/g, '')) || 0;
            const selectedAsset = document.getElementById('asset-select').value;

            // const deltaProfit = originalProfit - profitAmount; // 元の利益との差分を計算
            // 資産の更新
        if (selectedAsset && originalProfit > 0) {
            // 利益を削除するので、資産から利益金額を減算
            fetch('http://localhost:3000/api/updateAssetAmount', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assetId: selectedAsset,
                    amount: -originalProfit
                }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('利益が削除され、資産が更新されました。');
                } else {
                    alert('資産の更新に失敗しました。');
                }
            })
            .catch(error => {
                console.error('資産更新中にエラーが発生しました:', error);
            });
        }

        if (!selectedAsset) {
            if (confirm('キャンセルする場合の資産が未選択ですがよろしいでしょうか？')) {
                // 確認された場合に削除処理を続行
                deleteDataFromDatabase(currentCategory, selectedDate, ['profit', 'profit_details'], () => {
                    profitInput.value = 0;
                    profitDetails = [];
                    updateProfitDetailsList();
                    loadDataForSelectedDate();
                    renderCalendar(currentDate);
                });
            }
        } else {
            // 資産が選択されている場合の通常の削除処理
            deleteDataFromDatabase(currentCategory, selectedDate, ['profit', 'profit_details'], () => {
                profitInput.value = 0;
                profitDetails = [];
                updateProfitDetailsList();
                loadDataForSelectedDate();
                renderCalendar(currentDate);
            });
        }
            // deleteDataFromDatabase(currentCategory, selectedDate, ['profit', 'profit_details'], () => {
            //     profitInput.value = 0;
            //     profitDetails = [];
            //     updateProfitDetailsList();
            //     loadDataForSelectedDate();
            //     renderCalendar(currentDate);
            // });
        }
    });

    deleteExpenseButton.addEventListener('click', () => {
        if (selectedDate && currentCategory !== 'total') {

            // 削除する支出の金額を取得
        const expenseAmount = parseFloat(expenseInput.value.replace(/[^0-9.-]/g, '')) || 0;
        const selectedAsset = document.getElementById('asset-select').value;

        // const deltaExpense = originalExpense - expenseAmount; // 元の支出との差分を計算

        // 資産の更新
        if (selectedAsset && originalExpense > 0) {
            // 支出を削除するので、資産に支出金額を加算
            fetch('http://localhost:3000/api/updateAssetAmount', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assetId: selectedAsset,
                    amount: originalExpense // 支出は減算
                }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('支出が削除され、資産が更新されました。');
                } else {
                    alert('資産の更新に失敗しました。');
                }
            })
            .catch(error => {
                console.error('資産更新中にエラーが発生しました:', error);
            });
        }

        if (!selectedAsset) {
            if (confirm('キャンセルする場合の資産が未選択ですがよろしいでしょうか？')) {
                // 確認された場合に削除処理を続行
                deleteDataFromDatabase(currentCategory, selectedDate, ['expense', 'expense_details'], () => {
                    expenseInput.value = 0;
                    expenseDetails = [];
                    updateExpenseDetailsList();
                    loadDataForSelectedDate();
                    renderCalendar(currentDate);
                });
            }
        } else {
            // 資産が選択されている場合の通常の削除処理
            deleteDataFromDatabase(currentCategory, selectedDate, ['expense', 'expense_details'], () => {
                expenseInput.value = 0;
                expenseDetails = [];
                updateExpenseDetailsList();
                loadDataForSelectedDate();
                renderCalendar(currentDate);
            });
        }


            // deleteDataFromDatabase(currentCategory, selectedDate, ['expense', 'expense_details'], () => {
            //     expenseInput.value = 0;
            //     expenseDetails = [];
            //     updateExpenseDetailsList();
            //     loadDataForSelectedDate();
            //     renderCalendar(currentDate);
            // });
        }
    });

    deleteMemoButton.addEventListener('click', () => {
        if (selectedDate && currentCategory !== 'total') {
            deleteDataFromDatabase(currentCategory, selectedDate, ['memo'], () => {
                memoInput.value = "";
                loadDataForSelectedDate();
                renderCalendar(currentDate);
            });
        }
    });

    // 目標金額を保存
    goalSaveButton.addEventListener('click', () => {
        const goalAmount = parseFloat(goalInput.value) || 0;
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const selectedCurrency = categoryCurrencies[currentCategory] || 'JPY';

        saveGoalToDatabase(currentCategory, year, month, goalAmount, selectedCurrency, () => {
            displayGoalAmount();
            if (currentCategory === 'total') {
                calculateTotalGoalAndUpdateChart();
            } else {
                calculateCurrentBalanceForMonth(year, month, (balance) => {
                    updateGoalChart(balance, year, month);
                });
            }
        });
    });

    // メモを保存
    document.getElementById('category-memo-save-btn').addEventListener('click', () => {
        const category = categorySelect.value;
        const memo = document.getElementById('category-memo-input').value;

        fetch('http://localhost:3000/api/saveCategoryMemo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category, memo })
        })
        .then(response => response.json())
        .then(data => {
            alert('メモが保存されました');
        })
        .catch(error => {
            console.error('メモの保存に失敗しました:', error);
        });
    });

    // 初期化関数の呼び出し
    loadCategories();
    renderCalendar(currentDate, () => {
        const selectedCell = document.querySelector(`[data-date="${selectedDate}"]`);
        if (selectedCell) {
            selectedCell.classList.add('selected');
            selectedCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
    
    selectToday();
    displayGoalAmount();

    // 関数定義

     // 資産の通貨を取得する関数を定義
     // 修正後（方法1）：'==' を使用
function getAssetCurrency(assetId) {
    const asset = assetsList.find(a => a.id == assetId); // '==' を使用して型を自動変換
    return asset ? asset.currency : null;
}


function saveDataWithAsset() {
    const selectedAsset = document.getElementById('asset-select').value;
    const assetCurrency = getAssetCurrency(selectedAsset);
    const profitAmount = parseFloat(profitInput.value.replace(/[^0-9.-]/g, '')) || 0;
    const expenseAmount = parseFloat(expenseInput.value.replace(/[^0-9.-]/g, '')) || 0;
    const selectedCurrency = categoryCurrencies[currentCategory] || 'JPY';

    // 以前のデータを取得
    loadDataFromDatabase(currentCategory, selectedDate, (oldData) => {
        let oldProfit = 0;
        let oldExpense = 0;

        if (oldData) {
            oldProfit = parseFloat(oldData.profit) || 0;
            oldExpense = parseFloat(oldData.expense) || 0;

            // 通貨変換（必要な場合）
            if (oldData.currency !== assetCurrency) {
                oldProfit = convertAmount(oldProfit, oldData.currency, assetCurrency);
                oldExpense = convertAmount(oldExpense, oldData.currency, assetCurrency);
            }
        }

        // 新しい利益・支出の調整（通貨変換）
        let adjustedProfit = profitAmount;
        let adjustedExpense = expenseAmount;

        if (selectedCurrency !== assetCurrency) {
            adjustedProfit = convertAmount(profitAmount, selectedCurrency, assetCurrency);
            adjustedExpense = convertAmount(expenseAmount, selectedCurrency, assetCurrency);
        }

        // 差分を計算
        const deltaProfit = adjustedProfit - oldProfit;
        const deltaExpense = adjustedExpense - oldExpense;

        if (selectedAsset) {
            const promises = [];

            // 利益の差分を資産に反映
            if (deltaProfit !== 0) {
                const profitPromise = fetch('http://localhost:3000/api/updateAssetAmount', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        assetId: selectedAsset,
                        amount: deltaProfit
                    }),
                })
                .then(response => response.json())
                .then(data => {
                    if (!data.success) {
                        alert('利益による資産の更新に失敗しました。');
                    }
                })
                .catch(error => {
                    console.error('資産更新中にエラーが発生しました（利益）:', error);
                });

                promises.push(profitPromise);
            }

            // 支出の差分を資産から減算
            if (deltaExpense !== 0) {
                const expensePromise = fetch('http://localhost:3000/api/updateAssetAmount', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        assetId: selectedAsset,
                        amount: -deltaExpense // 差分をマイナスして減算
                    }),
                })
                .then(response => response.json())
                .then(data => {
                    if (!data.success) {
                        alert('支出による資産の更新に失敗しました。');
                    }
                })
                .catch(error => {
                    console.error('資産更新中にエラーが発生しました（支出）:', error);
                });

                promises.push(expensePromise);
            }

            // 資産更新後にデータを保存
            Promise.all(promises).then(() => {
                alert('データが記録され、資産が更新されました。');
                saveData();
            });
        } else {
            // 資産が未選択の場合、データのみ保存
            saveData();
        }
    });
}



    function saveData() {
        const selectedCurrency = categoryCurrencies[currentCategory] || 'JPY';
        const profit = parseFloat(profitInput.value.replace(/[^0-9.-]/g, '')) || 0;
        const expense = parseFloat(expenseInput.value.replace(/[^0-9.-]/g, '')) || 0;
        const memo = memoInput.value || "";
        const profitDetailsStr = JSON.stringify(profitDetails);
        const expenseDetailsStr = JSON.stringify(expenseDetails);
    
        saveDataToDatabase(currentCategory, selectedDate, profit, expense, memo, profitDetailsStr, expenseDetailsStr, selectedCurrency, () => {
            renderCalendar(currentDate);
            const selectedCell = document.querySelector(`[data-date="${selectedDate}"]`);
            if (selectedCell) {
                selectedCell.classList.add('selected');
            }
        });
    }
    

function saveExpense() {
    const selectedCurrency = categoryCurrencies[currentCategory] || 'JPY';
    const profit = parseFloat(profitInput.value.replace(/[^0-9.-]/g, '')) || 0;
    const expense = parseFloat(expenseInput.value.replace(/[^0-9.-]/g, '')) || 0;
    const memo = memoInput.value || "";
    const profitDetailsStr = JSON.stringify(profitDetails);
    const expenseDetailsStr = JSON.stringify(expenseDetails);

    saveDataToDatabase(currentCategory, selectedDate, profit, expense, memo, profitDetailsStr, expenseDetailsStr, selectedCurrency, () => {
        renderCalendar(currentDate);
        const selectedCell = document.querySelector(`[data-date="${selectedDate}"]`);
        if (selectedCell) {
            selectedCell.classList.add('selected');
        }
    });
}



// 支出削除時の資産変動ロジック
function deleteExpenseWithAsset(expenseId, expenseAmount, selectedAsset) {
    if (selectedAsset && expenseAmount > 0) {
        fetch('/api/updateAssetAmount', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                assetId: selectedAsset,
                amount: expenseAmount // 削除時は資産を戻す
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('支出が削除され、資産が更新されました。');
            } else {
                alert('資産の更新に失敗しました。');
            }
        })
        .catch(error => {
            console.error('資産更新中にエラーが発生しました:', error);
        });
    }

    // 既存の削除ロジックを呼び出す
    deleteExpense(expenseId); // 既存の関数がある場合
}


    // カテゴリをロードする関数
    function loadCategories(initialLoad = false) {
        fetch('http://localhost:3000/api/getCategories')
            .then(response => response.json())
            .then(categories => {
                categoriesList = categories;
                categorySelect.innerHTML = '<option value="" disabled>選択してください</option>'; // デフォルトの未選択オプション

                const categoryListDiv = document.getElementById('category-list');
                categoryListDiv.innerHTML = '';

                categories.forEach(category => {
                    // カテゴリの通貨を保存
                    categoryCurrencies[category.name] = category.currency;

                    // プルダウンメニューにカテゴリを追加
                    const option = document.createElement('option');
                    option.value = category.name;
                    option.text = category.name;
                    categorySelect.add(option);

                    // カテゴリ管理ページにカテゴリを表示
                    const categoryDiv = document.createElement('div');
                    categoryDiv.classList.add('category-item');

                    const nameSpan = document.createElement('span');
                    nameSpan.textContent = category.name;
                    categoryDiv.appendChild(nameSpan);

                    // 通貨表示
                    const currencySpan = document.createElement('span');
                    currencySpan.textContent = ` (${category.currency})`;
                    categoryDiv.appendChild(currencySpan);

                    // 通貨変更ボタン
                    const currencyButton = document.createElement('button');
                    currencyButton.textContent = '通貨変更';
                    currencyButton.addEventListener('click', () => {
                        const newCurrency = category.currency === 'JPY' ? 'USD' : 'JPY';
                        updateCategoryCurrency(category.id, newCurrency);
                    });
                    categoryDiv.appendChild(currencyButton);

                    // 名前変更ボタン
                    const editButton = document.createElement('button');
                    editButton.textContent = '名前変更';
                    editButton.addEventListener('click', () => {
                        const newName = prompt(`新しいカテゴリ名を入力してください:`, category.name);
                        if (newName) {
                            updateCategoryName(category.id, newName);
                        }
                    });
                    categoryDiv.appendChild(editButton);

                    // 上に移動ボタン
                    const upButton = document.createElement('button');
                    upButton.textContent = '↑';
                    upButton.addEventListener('click', () => {
                        moveCategoryPosition(categories, category.id, -1);
                    });
                    categoryDiv.appendChild(upButton);

                    // 下に移動ボタン
                    const downButton = document.createElement('button');
                    downButton.textContent = '↓';
                    downButton.addEventListener('click', () => {
                        moveCategoryPosition(categories, category.id, 1);
                    });
                    categoryDiv.appendChild(downButton);

                    // 削除ボタン
                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = '削除';
                    deleteButton.addEventListener('click', () => {
                        if (confirm(`カテゴリ「${category.name}」を削除してよろしいですか？`)) {
                            deleteCategory(category.id);
                        }
                    });
                    categoryDiv.appendChild(deleteButton);

                    categoryListDiv.appendChild(categoryDiv);
                });

                // 合計カテゴリを追加
                const totalOption = document.createElement('option');
                totalOption.value = 'total';
                totalOption.text = '合計';
                categorySelect.appendChild(totalOption);  // 一番下に追加

                categorySelect.value = currentCategory;
                updateCurrentCategory();

                // 最初のカテゴリを自動選択
                // 現在のカテゴリを維持または設定
                if (currentCategory && categories.some(cat => cat.name === currentCategory)) {
                  // currentCategory が有効な場合、そのまま維持
                 categorySelect.value = currentCategory;
                } else　if (categories.length > 0) {
                    currentCategory = categories[0].name;
                    categorySelect.value = currentCategory;

                    // 初期表示の目標金額を設定
                    const year = currentDate.getFullYear();
                    const month = currentDate.getMonth() + 1;
                    getGoalForCategory(currentCategory, year, month, (currentGoal) => {
                        goalDisplay.textContent = `現在の目標金額: ${currentGoal}`;
                        goalInput.value = currentGoal;
                    });

                    // データをロードしてからカレンダーを描画
                    loadDataForMonth(currentCategory, currentDate, (dataForMonth) => {
                       // renderCalendar(currentDate, dataForMonth); // データを渡してカレンダーを描画
                    });
                } else {
                    // カテゴリが存在しない場合、リセット
                    currentCategory = '';
                    resetInputFields();
                   // renderCalendar(currentDate);
                }
            })
            .catch(error => {
                console.error('カテゴリのロードに失敗しました:', error);
            });
    }

    // カテゴリを削除する関数
    function deleteCategory(id) {
        fetch('http://localhost:3000/api/deleteCategory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        })
            .then(response => response.json())
            .then(() => {
                loadCategories();
                // 現在のカテゴリが削除された場合、プルダウンの一番上のカテゴリを選択
                if (currentCategory === id) {
                    // カテゴリの一番上を選択する
                    const firstOption = categorySelect.options[1]; // インデックス1が最初の有効なカテゴリ
                    if (firstOption) {
                        currentCategory = firstOption.value;
                        categorySelect.value = currentCategory;
                        loadDataForSelectedDate(); // 新しいカテゴリに基づくデータをロード
                        renderCalendar(currentDate); // カレンダーを再描画
                    } else {
                        // カテゴリが存在しない場合、リセット
                        currentCategory = '';
                        categorySelect.value = '';
                        resetInputFields();
                        renderCalendar(currentDate); // カレンダーを再描画
                    }
                }
            })
            .catch(error => {
                console.error('カテゴリの削除に失敗しました:', error);
            });
    }

    // 入力フィールドのリセット関数
    function resetInputFields() {
        profitInput.value = 0;
        expenseInput.value = 0;
        memoInput.value = '';
        profitDetails = [];
        expenseDetails = [];
        updateProfitDetailsList();
        updateExpenseDetailsList();
        monthlyBalanceDiv.textContent = '月間損益: 0';
    }

    // カテゴリ名を更新する関数
    function updateCategoryName(id, newName) {
        fetch('http://localhost:3000/api/updateCategoryName', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, name: newName })
        })
            .then(response => response.json())
            .then(() => {
                loadCategories();
            })
            .catch(error => {
                console.error('カテゴリ名の更新に失敗しました:', error);
            });
    }

    // カテゴリの通貨を更新する関数
function updateCategoryCurrency(id, newCurrency) {
    fetch('http://localhost:3000/api/updateCategoryCurrency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, currency: newCurrency })
    })
    .then(response => response.json())
    .then(() => {
        // カテゴリの通貨を更新後、再度カテゴリ情報をロード
        loadCategories();

        // カレンダーを再描画
        if (currentCategory === 'total') {
            renderCalendarWithTotal();
            calculateTotalGoalAndUpdateChart();
        } else {
            renderCalendar(currentDate);
            calculateMonthlyBalance(currentDate.getFullYear(), currentDate.getMonth());
        }

        // 選択されている日付のデータを再度ロード
        loadDataForSelectedDate();

        // 表示されている金額を更新
        updateDisplayedAmounts();

    })
    .catch(error => {
        console.error('カテゴリの通貨の更新に失敗しました:', error);
    });
}


    // カテゴリの順番を変更する関数
    function moveCategoryPosition(categories, id, direction) {
        const index = categories.findIndex(cat => cat.id === id);
        if (index < 0) return;

        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= categories.length) return;

        // 順番を交換
        const tempPosition = categories[index].position;
        categories[index].position = categories[newIndex].position;
        categories[newIndex].position = tempPosition;

        // サーバーに更新を送信
        const updatedCategories = [
            { id: categories[index].id, position: categories[index].position },
            { id: categories[newIndex].id, position: categories[newIndex].position }
        ];

        fetch('http://localhost:3000/api/updateCategoryOrder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categories: updatedCategories })
        })
            .then(response => response.json())
            .then(() => {
                loadCategories();
            })
            .catch(error => {
                console.error('カテゴリの順番の更新に失敗しました:', error);
            });
    }

    // 現在のカテゴリを設定する関数
    function updateCurrentCategory() {
        currentCategory = categorySelect.value;
        // 必要に応じて他の処理を追加
    }

    // カテゴリ管理ページを開く関数
    function showCategoryManagementPage() {
        document.getElementById('main-content').style.display = 'none';
        document.getElementById('memo-page').style.display = 'none';
        document.getElementById('category-management-page').style.display = 'block';
        loadCategories();
    }

// 資産管理ページを開くボタンのイベントリスナー
document.getElementById('asset-management-btn').addEventListener('click', showAssetManagementPage);

// 資産管理ページの戻るボタンのイベントリスナー
document.getElementById('asset-management-back-btn').addEventListener('click', () => {
    document.getElementById('asset-management-page').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
});

// 資産管理ページの表示関数
async function showAssetManagementPage() {
    document.getElementById('main-content').style.display = 'none';
    document.getElementById('memo-page').style.display = 'none';
    document.getElementById('asset-management-page').style.display = 'block';
    await loadAssets();
    displayTotalAssetsInJPY(); // 合計金額を表示する関数を呼び出し
}

// 合計金額を計算して表示する関数
function displayTotalAssetsInJPY() {
    const assetListDiv = document.getElementById('asset-list');
    const assetItems = assetListDiv.querySelectorAll('.asset-item');
    let totalJPY = 0;

    assetItems.forEach(asset => {
        const amount = parseFloat(asset.querySelector('input').value) || 0;
        const currency = asset.querySelector('span').textContent.trim();

        if (currency.includes("USD")) {
            totalJPY += convertAmount(amount, 'USD', 'JPY');
        } else {
            totalJPY += amount;
        }
    });

    const totalDisplay = document.getElementById('asset-total-display');
    totalDisplay.textContent = `合計: ${totalJPY.toFixed(2)} JPY`;
}

// 資産をロードする関数
async　function loadAssets() {


    try {
        const response = await fetch('http://localhost:3000/api/getAssets');
        const assets = await response.json();

        assetsList = assets; // ここでグローバル変数に代入

        const assetListDiv = document.getElementById('asset-list');
        assetListDiv.innerHTML = '';


    // fetch('http://localhost:3000/api/getAssets')
    //     .then(response => response.json())
    //     .then(assets => {
    //         const assetListDiv = document.getElementById('asset-list');
    //         assetListDiv.innerHTML = '';

            let totalAmountJPY = 0;

            const assetSelect = document.getElementById('asset-select');
            assetSelect.innerHTML = '<option value="">未選択</option>';



            assets.forEach(asset => {

                const option = document.createElement('option');
                option.value = asset.id; // もしくは他の識別子を使用
                option.textContent = `${asset.name} (${asset.currency})`;
                assetSelect.appendChild(option);


                const assetDiv = document.createElement('div');
                assetDiv.classList.add('asset-item');

                const nameSpan = document.createElement('span');
                nameSpan.textContent = asset.name;
                assetDiv.appendChild(nameSpan);

                // 通貨表示
                const currencySpanEnd = document.createElement('span');
                currencySpanEnd.textContent = ` (${asset.currency})`;
                assetDiv.appendChild(currencySpanEnd);

                // 資産金額の入力フィールド
                const amountInput = document.createElement('input');
                amountInput.type = 'number'; // 数値のみを扱う
                amountInput.placeholder = '資産金額を入力';
                amountInput.value = asset.current_balance || 0; // 数値のみを設定
                assetDiv.appendChild(amountInput);

                // 通貨コードを表示
                const currencySpan = document.createElement('span');
                currencySpan.textContent = ` ${asset.currency}`; // 通貨コードを表示
                assetDiv.appendChild(currencySpan);

                // 保存ボタン
                const saveButton = document.createElement('button');
                saveButton.textContent = '保存';
                saveButton.addEventListener('click', () => {
                    saveAssetAmount(asset.id, parseFloat(amountInput.value));
                });
                assetDiv.appendChild(saveButton);

                // 通貨変更ボタン
                const currencyButton = document.createElement('button');
                currencyButton.textContent = '通貨変更';
                currencyButton.addEventListener('click', () => {
                    const newCurrency = asset.currency === 'JPY' ? 'USD' : 'JPY';
                    updateAssetCurrency(asset.id, newCurrency);
                });
                assetDiv.appendChild(currencyButton);

                // 名前変更ボタン
                const editButton = document.createElement('button');
                editButton.textContent = '名前変更';
                editButton.addEventListener('click', () => {
                    const newName = prompt(`新しい資産名を入力してください:`, asset.name);
                    if (newName) {
                        updateAssetName(asset.id, newName);
                    }
                });
                assetDiv.appendChild(editButton);

                // 削除ボタン
                const deleteButton = document.createElement('button');
                deleteButton.textContent = '削除';
                deleteButton.addEventListener('click', () => {
                    if (confirm(`資産「${asset.name}」を削除してよろしいですか？`)) {
                        deleteAsset(asset.id);
                    }
                });
                assetDiv.appendChild(deleteButton);

                // 通貨変換してJPYで合計計算
        const amount = parseFloat(amountInput.value);
        const amountInJPY = parseFloat(asset.currency === 'USD' ? convertAmount(amount, 'USD', 'JPY') : amount);
        totalAmountJPY += amountInJPY;

                assetListDiv.appendChild(assetDiv);
            });

             // 合計金額を表示する要素を更新
    const totalDisplay = document.getElementById('asset-total-display') || document.createElement('div');
    totalDisplay.id = 'asset-total-display';
    totalDisplay.classList.add('asset-total');
    totalDisplay.textContent = `合計: ${totalAmountJPY.toLocaleString()} JPY`;

    assetListDiv.appendChild(totalDisplay);

        // })
        // .catch(error => {
        //     console.error('資産のロードに失敗しました:', error);
        // });
    } catch (error) {
        console.error('資産のロードに失敗しました:', error);
    }

       
}

// ページ読み込み時に資産をロード
document.addEventListener('DOMContentLoaded', loadAssets);

// 資産金額を保存する関数
function saveAssetAmount(assetId, amount) {
    fetch('http://localhost:3000/api/saveAssetAmount', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: assetId, amount: amount }),
    })
    .then(response => response.json())
    .then(() => {
        alert('資産金額が保存されました');
        loadAssets(); // 更新後に資産リストを再読み込み
    })
    .catch(error => {
        console.error('資産金額の保存に失敗しました:', error);
        alert('資産金額の保存に失敗しました');
    });
}


// 資産の通貨を更新する関数
function updateAssetCurrency(id, newCurrency) {
    fetch('http://localhost:3000/api/updateAssetCurrency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, currency: newCurrency })
    })
    .then(response => response.json())
    .then(() => {
        loadAssets();
    })
    .catch(error => {
        console.error('資産の通貨の更新に失敗しました:', error);
    });
}

// 資産の名前を更新する関数
function updateAssetName(id, newName) {
    fetch('http://localhost:3000/api/updateAssetName', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: newName })
    })
    .then(response => response.json())
    .then(() => {
        loadAssets();
    })
    .catch(error => {
        console.error('資産名の更新に失敗しました:', error);
    });
}

// 資産を削除する関数
function deleteAsset(id) {
    fetch('http://localhost:3000/api/deleteAsset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    })
    .then(response => response.json())
    .then(() => {
        loadAssets();
    })
    .catch(error => {
        console.error('資産の削除に失敗しました:', error);
    });
}

// 新しい資産を追加するボタンのイベントリスナー
document.getElementById('add-asset-btn').addEventListener('click', () => {
    const newAssetName = prompt('新しい資産名を入力してください:');
    if (newAssetName) {
        const currency = confirm('この資産はドルで管理しますか？\n「OK」をクリックするとドル、「キャンセル」をクリックすると円になります。') ? 'USD' : 'JPY';
        fetch('http://localhost:3000/api/addAsset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newAssetName, currency })
        })
        .then(response => response.json())
        .then(() => {
            loadAssets();
        })
        .catch(error => {
            console.error('新しい資産の追加に失敗しました:', error);
        });
    }
});

document.getElementById('save-asset-amount-btn').addEventListener('click', async () => {
    const assetAmount = parseFloat(document.getElementById('asset-amount-input').value);
    if (isNaN(assetAmount)) {
        alert('有効な資産金額を入力してください');
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/saveAssetAmount', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ amount: assetAmount }),
        });
        const result = await response.json();
        alert('資産金額が保存されました');
        loadAssets(); // 最新の資産情報を再読み込み
    } catch (error) {
        console.error('資産金額の保存に失敗しました:', error);
        alert('資産金額の保存に失敗しました');
    }
});





    // メモページを表示する関数
    function showMemoPage() {
        document.getElementById('main-content').style.display = 'none';
        document.getElementById('category-management-page').style.display = 'none';
        document.getElementById('memo-page').style.display = 'block';

        const categoryName = categorySelect.options[categorySelect.selectedIndex].text;
        document.getElementById('memo-category-name').textContent = categoryName;

        loadCategoryMemo();
    }

    // カテゴリのメモをロード
    function loadCategoryMemo() {
        const category = categorySelect.value;

        fetch(`http://localhost:3000/api/getCategoryMemo?category=${encodeURIComponent(category)}`)
            .then(response => response.json())
            .then(data => {
                document.getElementById('category-memo-input').value = data.memo || '';
            })
            .catch(error => {
                console.error('カテゴリメモの取得に失敗しました:', error);
                document.getElementById('category-memo-input').value = '';
            });
    }

    // カレンダーを描画する関数
    function renderCalendar(date, callback) {

        // カレンダーの内容をクリア
        calendarBody.innerHTML = '';

        const year = date.getFullYear();
        const month = date.getMonth();
        const today = new Date();
        const todayDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        calendarBody.innerHTML = '';
        monthYear.textContent = `${year}年${month + 1}月`;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        let dateCount = 1;
        let rowCount = Math.ceil((firstDay + daysInMonth) / 7);

        loadDataForMonth(currentCategory, date, (dataForMonth) => {
            const dataMap = {};
            dataForMonth.forEach((entry) => {
                const dateObj = new Date(entry.date);
                const formattedDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
                dataMap[formattedDate] = entry;
            });

            for (let row = 0; row < rowCount; row++) {
                let tr = document.createElement('tr');
                for (let col = 0; col < 7; col++) {
                    let cell = document.createElement('td');
                    if (row === 0 && col < firstDay) {
                        cell.textContent = '';
                    } else if (dateCount > daysInMonth) {
                        cell.textContent = '';
                    } else {
                        const cellDateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(dateCount).padStart(2, '0')}`;
                        console.log('cellDateString:', cellDateString);
                        cell.setAttribute('data-date', cellDateString);

                        const dateNumberDiv = document.createElement('div');
                        dateNumberDiv.classList.add('date-number');
                        dateNumberDiv.textContent = dateCount;
                        cell.appendChild(dateNumberDiv);

                        if (cellDateString === todayDateString) {
                            cell.classList.add('today');
                        }

                        // ここで selectedDate と一致する場合に selected クラスを追加
                        if (cellDateString === selectedDate) {
                         cell.classList.add('selected');
                        }

                        if (dataMap[cellDateString]) {
                            const entry = dataMap[cellDateString];

                            if (entry.profit !== 0 || entry.expense !== 0) {

                                const profitDiv = document.createElement('div');
                                profitDiv.classList.add('profit');
                                profitDiv.textContent = `利益: ${entry.profit} ${entry.currency}`;

                                const expenseDiv = document.createElement('div');
                                expenseDiv.classList.add('expense');
                                expenseDiv.textContent = `支出: ${entry.expense} ${entry.currency}`;

                                cell.appendChild(profitDiv);
                                cell.appendChild(expenseDiv);
                            }
                        }

                        cell.addEventListener('click', () => {
                            const previouslySelected = document.querySelector('.selected');
                            if (previouslySelected) {
                                previouslySelected.classList.remove('selected');
                            }
                            cell.classList.add('selected');
                            selectedDate = cellDateString;
                            loadDataForSelectedDate();
                        });

                        dateCount++;
                    }
                    tr.appendChild(cell);
                }
                calendarBody.appendChild(tr);
            }

            calculateMonthlyBalance(year, month);
            // カレンダー描画後にコールバックを実行
    if (typeof callback === 'function') {
        callback();
    }
        });
    }

    // 今日の日付を選択状態にする関数
    function selectToday() {
        const today = new Date();
        const todayDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        selectedDate = todayDateString;

        const todayCell = document.querySelector(`[data-date="${todayDateString}"]`);
        if (todayCell) {
            todayCell.classList.add('selected');
        }

        loadDataForSelectedDate();
    }

    // 目標金額を表示する関数
    function displayGoalAmount() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;

        if (currentCategory === 'total') {
            // 現在のプルダウンのカテゴリを取得
            const categories = categoriesList.map(cat => cat.name);

            let totalGoal = 0;
            let promises = categories.map(category => {
                return new Promise((resolve) => {
                    getGoalForCategory(category, year, month, (goalAmount) => {
                        totalGoal += parseFloat(goalAmount) || 0;
                        resolve();
                    });
                });
            });
            Promise.all(promises).then(() => {
                goalDisplay.textContent = `現在の合計目標金額: ${totalGoal}`;
                goalInput.value = '';
            });
        } else {
            getGoalForCategory(currentCategory, year, month, (currentGoal) => {
                goalDisplay.textContent = `現在の目標金額: ${currentGoal}`;
                goalInput.value = currentGoal;
            });
        }
    }

    // 目標金額を取得する関数
    function getGoalForCategory(category, year, month, callback) {
        fetch(`http://localhost:3000/api/getGoal?category=${encodeURIComponent(category)}&year=${year}&month=${month}`)
            .then(response => response.json())
            .then(goalData => {
                const parsedGoal = parseFloat(goalData.goal_amount) || 0;
                callback(parsedGoal);
            })
            .catch(error => {
                console.error('目標金額の取得に失敗しました:', error);
                callback(0);
            });
    }

    // 月間データを取得する関数
    function loadDataForMonth(category, date, callback) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;

        fetch(`http://localhost:3000/api/getDataForMonth?category=${encodeURIComponent(category)}&year=${year}&month=${month}`)
            .then(response => response.json())
            .then(data => {
                callback(data);
            })
            .catch(error => {
                console.error('データの取得に失敗しました:', error);
                callback([]);
            });
    }

    // 月間損益を計算する関数
    function calculateMonthlyBalance(year, month) {
        if (currentCategory === 'total') {
            return;
        }
        loadDataForMonth(currentCategory, currentDate, (dataForMonth) => {
            let totalProfit = 0;
            let totalExpense = 0;
            const categoryCurrency = categoryCurrencies[currentCategory];

            dataForMonth.forEach((entry) => {
                let profit = parseFloat(entry.profit) || 0;
                let expense = parseFloat(entry.expense) || 0;

                if (entry.currency !== categoryCurrency) {
                    profit = parseFloat(convertAmount(profit, entry.currency, categoryCurrency));
                    expense = parseFloat(convertAmount(expense, entry.currency, categoryCurrency));
                }

                totalProfit += profit;
                totalExpense += expense;
            });

            const balance = totalProfit - totalExpense;
            monthlyBalanceDiv.textContent = `月間損益: ${balance} ${categoryCurrency}`;

            if (balance >= 0) {
                monthlyBalanceDiv.style.color = 'green';
            } else {
                monthlyBalanceDiv.style.color = 'red';
            }

            updateGoalChart(balance, year, month + 1);
        });
    }

    // 目標達成率の円グラフを更新する関数
    function updateGoalChart(balance, year, month) {
        getGoalForCategory(currentCategory, year, month, (goal) => {
            let percentage = 0;

            if (goal !== 0) {
                percentage = Math.min(100, Math.max(0, (balance / goal) * 100));
            }

            let backgroundColor;
            if (goal > 0 && balance >= 0) {
                backgroundColor = ['green', 'lightgrey'];
            } else if (goal < 0 && balance <= 0) {
                backgroundColor = ['red', 'lightgrey'];
            } else {
                backgroundColor = ['grey', 'lightgrey'];
            }

            const chartData = {
                labels: ['達成率', '未達成率'],
                datasets: [{
                    data: [percentage, 100 - percentage],
                    backgroundColor: backgroundColor
                }]
            };

            if (goalChart) {
                goalChart.destroy();
            }

            goalChart = new Chart(goalChartCanvas, {
                type: 'doughnut',
                data: chartData,
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'bottom',
                        }
                    }
                }
            });
        });
    }

    // 選択された日付のデータをロードする関数
    function loadDataForSelectedDate() {
        if (selectedDate) {
            if (currentCategory === 'total') {
                profitInput.value = 0;
                expenseInput.value = 0;
                memoInput.value = "";
                document.getElementById('memo-date').textContent = "";
                profitDetails = [];
                expenseDetails = [];
                updateProfitDetailsList();
                updateExpenseDetailsList();
            } else {
                loadDataFromDatabase(currentCategory, selectedDate, (data) => {
                    if (data) {
                        originalProfit = parseFloat(data.profit) || 0; // 元の利益を保存
                        originalExpense = parseFloat(data.expense) || 0; // 元の支出を保存
                        profitInput.value = `${data.profit || 0} ${data.currency}`;
                        expenseInput.value = `${data.expense || 0} ${data.currency}`;
                        memoInput.value = data.memo || "";
                        profitDetails = JSON.parse(data.profit_details || '[]');
                        expenseDetails = JSON.parse(data.expense_details || '[]');
                        updateProfitDetailsList();
                        updateExpenseDetailsList();
                    } else {
                        originalProfit = 0;
                        originalExpense = 0;
                        profitInput.value = 0;
                        expenseInput.value = 0;
                        memoInput.value = "";
                        profitDetails = [];
                        expenseDetails = [];
                        updateProfitDetailsList();
                        updateExpenseDetailsList();
                    }

                    const [yearStr, monthStr, dayStr] = selectedDate.split('-');
                    const dateObj = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, parseInt(dayStr, 10));

                    const selectedDateText = dateObj.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
                    document.getElementById('memo-date').textContent = selectedDateText;

                    updateDisplayedAmounts();
                });
            }
        }
    }

    // データベースからデータを取得する関数
    function loadDataFromDatabase(category, date, callback) {
        fetch(`http://localhost:3000/api/getData?category=${encodeURIComponent(category)}&date=${encodeURIComponent(date)}`)
            .then(response => response.json())
            .then(data => {
                callback(data);
            })
            .catch(error => {
                console.error('データの取得に失敗しました:', error);
                callback(null);
            });
    }

    // 利益の詳細を更新
    function updateProfitDetailsList() {
        const list = document.getElementById('profit-details-list');
        list.innerHTML = '';
        profitDetails.forEach((detail, index) => {
            const detailDiv = document.createElement('div');
            detailDiv.textContent = `${detail.description}: ${detail.amount}`;
            // 削除ボタンを追加
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '×';
            deleteBtn.classList.add('delete-detail-btn');
            deleteBtn.addEventListener('click', () => {
                profitDetails.splice(index, 1);
                updateProfitDetailsList();
                updateTotalProfit();
            });
            detailDiv.appendChild(deleteBtn);
            list.appendChild(detailDiv);
        });
    }

    // 支出の詳細を更新
    function updateExpenseDetailsList() {
        const list = document.getElementById('expense-details-list');
        list.innerHTML = '';
        expenseDetails.forEach((detail, index) => {
            const detailDiv = document.createElement('div');
            detailDiv.textContent = `${detail.description}: ${detail.amount}`;
            // 削除ボタンを追加
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '×';
            deleteBtn.classList.add('delete-detail-btn');
            deleteBtn.addEventListener('click', () => {
                expenseDetails.splice(index, 1);
                updateExpenseDetailsList();
                updateTotalExpense();
            });
            detailDiv.appendChild(deleteBtn);
            list.appendChild(detailDiv);
        });
    }

    // 利益の合計を計算
    function updateTotalProfit() {
        const total = profitDetails.reduce((sum, detail) => sum + detail.amount, 0);
        profitInput.value = `${total} ${categoryCurrencies[currentCategory] || 'JPY'}`;
    }

    // 支出の合計を計算
    function updateTotalExpense() {
        const total = expenseDetails.reduce((sum, detail) => sum + detail.amount, 0);
        expenseInput.value = `${total} ${categoryCurrencies[currentCategory] || 'JPY'}`;
    }

    // データベースにデータを保存する関数
    function saveDataToDatabase(category, date, profit, expense, memo, profitDetails, expenseDetails, currency, callback) {
        fetch('http://localhost:3000/api/saveData', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ category, date, profit, expense, memo, profitDetails, expenseDetails, currency })
        })
        .then(response => response.json())
        .then(data => {
            console.log('データが保存されました:', data);
            if (callback) callback();
        })
        .catch(error => {
            console.error('データの保存に失敗しました:', error);
        });
    }

    // データ削除用の関数を追加
    function deleteDataFromDatabase(category, date, fieldsToDelete, callback) {
        fetch('http://localhost:3000/api/deleteData', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category, date, fields: fieldsToDelete })
        })
        .then(response => response.json())
        .then(data => {
            console.log('データが削除されました:', data);
            if (callback) callback();
        })
        .catch(error => {
            console.error('データの削除に失敗しました:', error);
        });
    }

    // 目標金額をデータベースに保存する関数
    function saveGoalToDatabase(category, year, month, goalAmount, currency, callback) {
        fetch('http://localhost:3000/api/saveGoal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ category, year, month, goalAmount, currency })
        })
        .then(response => response.json())
        .then(data => {
            console.log('目標金額が保存されました:', data);
            if (callback) callback();
        })
        .catch(error => {
            console.error('目標金額の保存に失敗しました:', error);
        });
    }

    // 現在の月の収支（利益 - 支出）を計算する関数
    function calculateCurrentBalanceForMonth(year, month, callback) {
        loadDataForMonth(currentCategory, currentDate, (dataForMonth) => {
            let totalProfit = 0;
            let totalExpense = 0;
            const categoryCurrency = categoryCurrencies[currentCategory];

            dataForMonth.forEach((entry) => {
                let profit = parseFloat(entry.profit) || 0;
                let expense = parseFloat(entry.expense) || 0;

                if (entry.currency !== categoryCurrency) {
                    profit = parseFloat(convertAmount(profit, entry.currency, categoryCurrency));
                    expense = parseFloat(convertAmount(expense, entry.currency, categoryCurrency));
                }

                totalProfit += profit;
                totalExpense += expense;
            });

            const balance = totalProfit - totalExpense;
            callback(balance);
        });
    }

  // 初期化関数
async function initializeDisplay() {
    // 一時的に空に設定して初期表示を防止
    // profitInput.value = '';
    // expenseInput.value = '';
    // monthlyBalanceDiv.textContent = '';

    await fetchExchangeRate(); // 為替レート取得
    // updateDisplayedAmounts(); // 表示更新
}

    // 合計カテゴリの場合のカレンダーを描画する関数
    function renderCalendarWithTotal() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const totalCurrency = 'JPY';  // 基準通貨をJPYとする
        const today = new Date();
        const todayDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        calendarBody.innerHTML = '';
        monthYear.textContent = `${year}年${month + 1}月`;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        let dateCount = 1;
        let rowCount = Math.ceil((firstDay + daysInMonth) / 7);

        const categories = categoriesList.map(cat => cat.name);

        let promises = [];

        for (let category of categories) {
            promises.push(new Promise((resolve) => {
                loadDataForMonth(category, currentDate, (data) => {
                    resolve({ category, data });
                });
            }));
        }

        Promise.all(promises).then((results) => {
            const dataMap = {};

            results.forEach(({ category, data }) => {
                const categoryCurrency = categoryCurrencies[category];
                data.forEach((entry) => {
                    const dateObj = new Date(entry.date);
                    const formattedDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

                    if (!dataMap[formattedDate]) {
                        dataMap[formattedDate] = { profit: 0, expense: 0 };
                    }

                    let profit = parseFloat(entry.profit) || 0;
                    let expense = parseFloat(entry.expense) || 0;

                    if (entry.currency !== totalCurrency) {
                        profit = parseFloat(convertAmount(profit, entry.currency, totalCurrency));
                        expense = parseFloat(convertAmount(expense, entry.currency, totalCurrency));
                    }

                    dataMap[formattedDate].profit += profit;
                    dataMap[formattedDate].expense += expense;
                });
            });

            for (let row = 0; row < rowCount; row++) {
                let tr = document.createElement('tr');
                for (let col = 0; col < 7; col++) {
                    let cell = document.createElement('td');
                    if (row === 0 && col < firstDay) {
                        cell.textContent = '';
                    } else if (dateCount > daysInMonth) {
                        cell.textContent = '';
                    } else {
                        const cellDateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(dateCount).padStart(2, '0')}`;
                        cell.setAttribute('data-date', cellDateString);

                        const dateNumberDiv = document.createElement('div');
                        dateNumberDiv.classList.add('date-number');
                        dateNumberDiv.textContent = dateCount;
                        cell.appendChild(dateNumberDiv);

                        if (cellDateString === todayDateString) {
                            cell.classList.add('today');
                        }

                        if (dataMap[cellDateString]) {
                            const entry = dataMap[cellDateString];

                            if (entry.profit !== 0 || entry.expense !== 0) {

                                const profitDiv = document.createElement('div');
                                profitDiv.classList.add('profit');
                                profitDiv.textContent = `利益: ${entry.profit} JPY`;

                                const expenseDiv = document.createElement('div');
                                expenseDiv.classList.add('expense');
                                expenseDiv.textContent = `支出: ${entry.expense} JPY`;

                                cell.appendChild(profitDiv);
                                cell.appendChild(expenseDiv);
                            }
                        }

                        dateCount++;
                    }
                    tr.appendChild(cell);
                }
                calendarBody.appendChild(tr);
            }

            calculateTotalMonthlyBalance(dataMap);
        });
    }

    // お気に入りに追加する関数
    function addFavorite() {
        if (selectedDate) {

            const favoriteText = prompt("お気に入り登録の名前を入力してください:");
            if (!favoriteText) return; // ユーザーがキャンセルした場合は終了

            const profit = parseFloat(profitInput.value) || 0;
            const expense = parseFloat(expenseInput.value) || 0;
            const memo = memoInput.value || "";
            const category = currentCategory; // 現在のカテゴリーを取得
    
            fetch('http://localhost:3000/api/addFavorite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: selectedDate, profit, expense, memo, category ,title: favoriteText }) // categoryを追加
            })
            .then(response => response.json())
            .then(data => {
                alert('お気に入りに登録されました');
                loadFavorites(); // お気に入りのリストを再読み込み
            })
            .catch(error => console.error('お気に入り登録に失敗しました:', error));
        }
    }
   
    function formatDateToJapanese(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
    }

// 修正された loadFavorites 関数
function loadFavorites() {
    fetch('http://localhost:3000/api/getFavorites')
    .then(response => response.json())
    .then(data => {
        const favoriteListDiv = document.getElementById('favorite-list');
        favoriteListDiv.innerHTML = '';
        data.forEach(fav => {
            renderFavoriteItem(fav); // favオブジェクトを渡す
        });
    })
    .catch(error => console.error('お気に入りリストの取得に失敗しました:', error));
}

// 修正された renderFavoriteItem 関数
function renderFavoriteItem(fav) {
    const list = document.getElementById('favorite-list');
    
    const item = document.createElement('div');
    item.classList.add('favorite-item');
    item.dataset.id = fav.id;

    const itemText = document.createElement('span');
    itemText.textContent = `${fav.title}-${formatDateToJapanese(fav.date)}(カテゴリー：${fav.category}) `;

    // お気に入り項目をクリックしたときのイベントリスナーを追加
    itemText.addEventListener('click', () => {
        const dateObj = new Date(fav.date);
        selectedDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

        currentDate = new Date(selectedDate);
        currentCategory = fav.category;
        categorySelect.value = currentCategory;
        categorySelect.dispatchEvent(new Event('change'));

        // renderCalendar(currentDate, () => {
        //     const selectedCell = document.querySelector(`[data-date="${selectedDate}"]`);
        //     if (selectedCell) {
        //         selectedCell.classList.add('selected');
        //         selectedCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
        //     }
        //     loadDataForSelectedDate();
        // });

        document.getElementById('favorite-page').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
    });

    const deleteButton = document.createElement('button');
    deleteButton.textContent = '❌';
    deleteButton.classList.add('delete-button');
    deleteButton.addEventListener('click', (e) => {
        e.stopPropagation(); // イベントのバブリングを停止
        if (!fav.id) {
            console.error('削除しようとしているお気に入りのIDが存在しません:', fav);
            return;
        }
        removeFavoriteItem(fav.id);
        list.removeChild(item);
    });

    item.appendChild(itemText);
    item.appendChild(deleteButton);
    list.appendChild(item);
}

function removeFavoriteItem(id) {
    // 必要に応じてデータベースやバックエンドとの通信処理を追加
    fetch(`http://localhost:3000/api/removeFavorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    })
    .then(response => response.json())
    .then(data => {
        console.log('お気に入りが削除されました:', data);
    })
    .catch(error => {
        console.error('お気に入りの削除に失敗しました:', error);
    });
}

// // テスト用: お気に入りを追加
// renderFavoriteItem('テストのお気に入り', 1);




    // 合計カテゴリの場合の月間損益を計算する関数
    function calculateTotalMonthlyBalance(dataMap) {
        let totalProfit = 0;
        let totalExpense = 0;

        for (let date in dataMap) {
            totalProfit += dataMap[date].profit;
            totalExpense += dataMap[date].expense;
        }

        const balance = totalProfit - totalExpense;
        monthlyBalanceDiv.textContent = `月間損益: ${balance} JPY`;

        if (balance >= 0) {
            monthlyBalanceDiv.style.color = 'green';
        } else {
            monthlyBalanceDiv.style.color = 'red';
        }
    }

    // 合計カテゴリの場合の目標金額と達成率を計算してグラフを更新する関数
    function calculateTotalGoalAndUpdateChart() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;

        const categories = categoriesList.map(cat => cat.name);

        let totalGoal = 0;
        let totalBalance = 0;

        let goalPromises = categories.map(category => {
            return new Promise((resolve) => {
                getGoalForCategory(category, year, month, (goalAmount) => {
                    let categoryCurrency = categoryCurrencies[category];
                    if (categoryCurrency !== 'JPY') {
                        goalAmount = parseFloat(convertAmount(goalAmount, categoryCurrency, 'JPY'));
                    }
                    totalGoal += parseFloat(goalAmount) || 0;
                    resolve();
                });
            });
        });

        let balancePromises = categories.map(category => {
            return new Promise((resolve) => {
                loadDataForMonth(category, currentDate, (dataForMonth) => {
                    let categoryProfit = 0;
                    let categoryExpense = 0;
                    const categoryCurrency = categoryCurrencies[category];
                    dataForMonth.forEach((entry) => {
                        let profit = parseFloat(entry.profit) || 0;
                        let expense = parseFloat(entry.expense) || 0;
                        if (entry.currency !== 'JPY') {
                            profit = parseFloat(convertAmount(profit, entry.currency, 'JPY'));
                            expense = parseFloat(convertAmount(expense, entry.currency, 'JPY'));
                        }
                        categoryProfit += profit;
                        categoryExpense += expense;
                    });
                    totalBalance += categoryProfit - categoryExpense;
                    resolve();
                });
            });
        });

        Promise.all([...goalPromises, ...balancePromises]).then(() => {
            let percentage = 0;
            if (totalGoal !== 0) {
                percentage = Math.min(100, Math.max(0, (totalBalance / totalGoal) * 100));
            }

            let backgroundColor;
            if (totalGoal > 0 && totalBalance >= 0) {
                backgroundColor = ['green', 'lightgrey'];
            } else if (totalGoal < 0 && totalBalance <= 0) {
                backgroundColor = ['red', 'lightgrey'];
            } else {
                backgroundColor = ['grey', 'lightgrey'];
            }

            const chartData = {
                labels: ['達成率', '未達成率'],
                datasets: [{
                    data: [percentage, 100 - percentage],
                    backgroundColor: backgroundColor
                }]
            };

            if (goalChart) {
                goalChart.destroy();
            }

            goalChart = new Chart(goalChartCanvas, {
                type: 'doughnut',
                data: chartData,
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'bottom',
                        }
                    }
                }
            });

            goalDisplay.textContent = `現在の合計目標金額: ${totalGoal} JPY`;
        });
    }

});
