// app.js




// グローバル変数の初期化（DOMに依存しないもの）
let currentDate = new Date();
let selectedDate = null;
let goalChart = null;
let currentCategory = ''; // デフォルトのカテゴリ
let profitDetails = [];
let expenseDetails = [];
let categoriesList = [];

document.addEventListener('DOMContentLoaded', function() {
    // DOM要素の取得

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
    monthlyBalanceDiv.textContent = `月間損益: ${monthlyBalanceDiv.textContent || 0} JPY`;


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
    // Add a dropdown for currency selection in HTML
    const currencySelect = document.createElement('select');
    
    currencySelect.id = 'currency-select';
    currencySelect.innerHTML = `
        <option value="JPY">円</option>
        <option value="USD">ドル</option>
    `;
    document.querySelector('.menu-right').appendChild(currencySelect);



    // Fetch the currency exchange rate (assuming it's already obtained once daily and available in `usdToJpyRate`)
    let usdToJpyRate = 0; // Placeholder, to be set from fetched data
    async function fetchExchangeRate() {
        try {
            const response = await fetch('http://localhost:3000/api/usd-jpy');
            const data = await response.json();
            usdToJpyRate = data.rate || 1; // Default to 1 if the rate is not available
        } catch (error) {
            console.error('Error fetching exchange rate:', error);
        }
    }
    fetchExchangeRate(); // Initial fetch
        // Initial display of JPY in input fields and balance
updateDisplayedAmounts();

// Helper function to convert amounts based on selected currency
function convertAmount(amount, toCurrency) {
    if (toCurrency === 'USD' && usdToJpyRate) {
        return (amount / usdToJpyRate).toFixed(2); // Convert JPY to USD
    } else if (toCurrency === 'JPY' && usdToJpyRate) {
        return (amount * usdToJpyRate).toFixed(0); // Convert USD back to JPY
    }
    return amount; // Return the original amount if currency or rate is missing
}

// Update displayed amounts based on currency selection
currencySelect.addEventListener('change', () => {
    updateDisplayedAmounts();
});

function updateDisplayedAmounts() {
    const selectedCurrency = currencySelect.value;

    // Update profit and expense display
    const profitAmount = parseFloat(profitInput.value.replace(/[^0-9.-]/g, '')) || 0;
    const expenseAmount = parseFloat(expenseInput.value.replace(/[^0-9.-]/g, '')) || 0;

    profitInput.value = `${convertAmount(profitAmount, selectedCurrency)} ${selectedCurrency}`;
    expenseInput.value = `${convertAmount(expenseAmount, selectedCurrency)} ${selectedCurrency}`;
    
    // Update monthly balance display
    const balance = parseFloat(monthlyBalanceDiv.textContent.replace(/[^0-9.-]/g, '')) || 0;
    monthlyBalanceDiv.textContent = `月間損益: ${convertAmount(balance, selectedCurrency)} ${selectedCurrency}`;
}



    // ドル円レートを取得して表示
    async function fetchUsdJpyRate() {
        try {
            //const response = await fetch('http://localhost:3000/api/usd-jpy');
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
    // 10秒ごとに為替レートを更新
    //setInterval(fetchUsdJpyRate, 10000);

    fetchUsdJpyRate();
    


    // 「日記家計簿」ボタンのクリックイベント
    diaryLedgerButton.addEventListener('click', () => {
        document.getElementById('memo-page').style.display = 'none';
        document.getElementById('category-management-page').style.display = 'none';
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
            fetch('http://localhost:3000/api/addCategory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newCategoryName })
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
        if (currentCategory === '') {
            // カテゴリが選択されていない場合、入力を無効化
            resetInputFields();
        monthlyBalanceDiv.textContent = '月間損益: 0';
        } else　if (currentCategory === 'total') {
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
            renderCalendar(currentDate);
            calculateMonthlyBalance(currentDate.getFullYear(), currentDate.getMonth());
            displayGoalAmount();
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
        if (selectedDate) {
            const profit = parseInt(profitInput.value, 10) || 0;
            const expense = parseInt(expenseInput.value, 10) || 0;
            const memo = memoInput.value || "";
            const profitDetailsStr = JSON.stringify(profitDetails);
            const expenseDetailsStr = JSON.stringify(expenseDetails);
            saveDataToDatabase(currentCategory, selectedDate, profit, expense, memo, profitDetailsStr, expenseDetailsStr, () => {
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
            const profit = parseInt(profitInput.value, 10) || 0;
            const expense = parseInt(expenseInput.value, 10) || 0;
            const memo = memoInput.value || "";
            const profitDetailsStr = JSON.stringify(profitDetails);
            const expenseDetailsStr = JSON.stringify(expenseDetails);
            saveDataToDatabase(currentCategory, selectedDate, profit, expense, memo, profitDetailsStr, expenseDetailsStr, () => {
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
        const amount = parseInt(document.getElementById('profit-detail-amount').value, 10) || 0;
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
        const amount = parseInt(document.getElementById('expense-detail-amount').value, 10) || 0;
        const description = document.getElementById('expense-detail-description').value;

        expenseDetails.push({ amount, description });
        updateExpenseDetailsList();
        updateTotalExpense();
        closeModal(document.getElementById('expense-detail-modal'));
        document.getElementById('expense-detail-amount').value = '';
        document.getElementById('expense-detail-description').value = '';
    });

    // 削除ボタンのイベントリスナーを追加
    deleteProfitButton.addEventListener('click', () => {
        if (selectedDate && currentCategory !== 'total') {
            deleteDataFromDatabase(currentCategory, selectedDate, ['profit', 'profit_details'], () => {
                profitInput.value = 0;
                profitDetails = [];
                updateProfitDetailsList();
                loadDataForSelectedDate();
                renderCalendar(currentDate);
            });
        }
    });

    deleteExpenseButton.addEventListener('click', () => {
        if (selectedDate && currentCategory !== 'total') {
            deleteDataFromDatabase(currentCategory, selectedDate, ['expense', 'expense_details'], () => {
                expenseInput.value = 0;
                expenseDetails = [];
                updateExpenseDetailsList();
                loadDataForSelectedDate();
                renderCalendar(currentDate);
            });
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
        const goalAmount = parseInt(goalInput.value, 10) || 0;
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;

        saveGoalToDatabase(currentCategory, year, month, goalAmount, () => {
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
    renderCalendar(currentDate);
    selectToday();
    displayGoalAmount();

    // 関数定義

    // カテゴリをロードする関数
    function loadCategories(initialLoad = false) {
        fetch('http://localhost:3000/api/getCategories')
            .then(response => response.json())
            .then(categories => {
                categorySelect.innerHTML = '<option value="" disabled>選択してください</option>'; // デフォルトの未選択オプション

                const categoryListDiv = document.getElementById('category-list');
                categoryListDiv.innerHTML = '';

                categories.forEach(category => {
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
            if (categories.length > 0) {
                currentCategory = categories[0].name;
                categorySelect.value = currentCategory;

 
                // 初期表示の目標金額を設定
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth() + 1;
                getGoalForCategory(currentCategory, year, month, (currentGoal) => {
                    goalDisplay.textContent = `現在の目標金額: ${currentGoal}`;
                    goalInput.value = currentGoal;
                });
                //loadDataForSelectedDate();
                // 初期ロードの場合にのみカレンダーを描画
                //if (initialLoad) {
                 //   renderCalendar(currentDate);
               // }
                // データをロードしてからカレンダーを描画
                loadDataForMonth(currentCategory, currentDate, (dataForMonth) => {
                    renderCalendar(currentDate, dataForMonth); // データを渡してカレンダーを描画
                });
            } else {
                // カテゴリが存在しない場合、リセット
                currentCategory = '';
                resetInputFields();
                renderCalendar(currentDate);
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
    function renderCalendar(date) {

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
                                profitDiv.textContent = `利益: ${entry.profit}`;

                                const expenseDiv = document.createElement('div');
                                expenseDiv.classList.add('expense');
                                expenseDiv.textContent = `支出: ${entry.expense}`;

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
    const categories = Array.from(categorySelect.options)
    .map(option => option.value)
    .filter(value => value !== '' && value !== 'total'); // 無効なカテゴリと「合計」を除外
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
            .then(goalAmount => {
                const parsedGoal = parseFloat(goalAmount) || 0;
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

            dataForMonth.forEach((entry) => {
                totalProfit += parseFloat(entry.profit) || 0;
                totalExpense += parseFloat(entry.expense) || 0;
            });

            const balance = totalProfit - totalExpense;
            monthlyBalanceDiv.textContent = `月間損益: ${balance} JPY`;

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
                        profitInput.value = data.profit || 0;
                        expenseInput.value = data.expense || 0;
                        memoInput.value = data.memo || "";
                        profitDetails = JSON.parse(data.profit_details || '[]');
                        expenseDetails = JSON.parse(data.expense_details || '[]');
                        updateProfitDetailsList();
                        updateExpenseDetailsList();
                    } else {
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
        profitInput.value = total;
    }

    // 支出の合計を計算
    function updateTotalExpense() {
        const total = expenseDetails.reduce((sum, detail) => sum + detail.amount, 0);
        expenseInput.value = total;
    }

    // データベースにデータを保存する関数
    function saveDataToDatabase(category, date, profit, expense, memo, profitDetails, expenseDetails, callback) {
        fetch('http://localhost:3000/api/saveData', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ category, date, profit, expense, memo, profitDetails, expenseDetails })
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
    function saveGoalToDatabase(category, year, month, goalAmount, callback) {
        fetch('http://localhost:3000/api/saveGoal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ category, year, month, goalAmount })
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

            dataForMonth.forEach((entry) => {
                totalProfit += parseFloat(entry.profit) || 0;
                totalExpense += parseFloat(entry.expense) || 0;
            });

            const balance = totalProfit - totalExpense;
            callback(balance);
        });
    }

    // 合計カテゴリの場合のカレンダーを描画する関数
    function renderCalendarWithTotal() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const today = new Date();
        const todayDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        calendarBody.innerHTML = '';
        monthYear.textContent = `${year}年${month + 1}月`;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        let dateCount = 1;
        let rowCount = Math.ceil((firstDay + daysInMonth) / 7);

        //const categories = ['web3', 'blog', 'part-time', 'food', 'social', 'taxes', 'business', 'leisure'];
        // 現在のプルダウンのカテゴリを取得
    const categories = Array.from(categorySelect.options)
    .map(option => option.value)
    .filter(value => value !== '' && value !== 'total'); // 無効なカテゴリと「合計」を除外

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
                data.forEach((entry) => {
                    const dateObj = new Date(entry.date);
                    const formattedDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

                    if (!dataMap[formattedDate]) {
                        dataMap[formattedDate] = { profit: 0, expense: 0 };
                    }

                    dataMap[formattedDate].profit += parseFloat(entry.profit) || 0;
                    dataMap[formattedDate].expense += parseFloat(entry.expense) || 0;
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
                                profitDiv.textContent = `利益: ${entry.profit}`;

                                const expenseDiv = document.createElement('div');
                                expenseDiv.classList.add('expense');
                                expenseDiv.textContent = `支出: ${entry.expense}`;

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

        // 現在のプルダウンのカテゴリを取得
    const categories = Array.from(categorySelect.options)
    .map(option => option.value)
    .filter(value => value !== '' && value !== 'total'); // 無効なカテゴリと「合計」を除外
        let totalGoal = 0;
        let totalBalance = 0;

        let goalPromises = categories.map(category => {
            return new Promise((resolve) => {
                getGoalForCategory(category, year, month, (goalAmount) => {
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
                    dataForMonth.forEach((entry) => {
                        categoryProfit += parseFloat(entry.profit) || 0;
                        categoryExpense += parseFloat(entry.expense) || 0;
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

            goalDisplay.textContent = `現在の合計目標金額: ${totalGoal}`;
        });
    }

});
