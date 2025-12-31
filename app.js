// ======================
// BUDGET CONTROLLER
// ======================
var budgetController = (function () {

    var Expense = function (id, description, value) {
        this.id = id;
        this.description = description;
        this.value = value;
        this.percentage = -1;
    };

    Expense.prototype.calcPercentage = function (totalIncome) {
        this.percentage = totalIncome > 0
            ? Math.round((this.value / totalIncome) * 100)
            : -1;
    };

    Expense.prototype.getPercentage = function () {
        return this.percentage;
    };

    var Income = function (id, description, value) {
        this.id = id;
        this.description = description;
        this.value = value;
    };

    var data = {
        allItems: { exp: [], inc: [] },
        totals: { exp: 0, inc: 0 },
        budget: 0,
        percentage: -1
    };

    var calculateTotal = function (type) {
        var sum = 0;
        data.allItems[type].forEach(function (cur) {
            sum += cur.value;
        });
        data.totals[type] = sum;
    };

    return {
        addItem: function (type, des, val) {
            var newItem, ID;
            if (data.allItems[type].length > 0) {
                ID = data.allItems[type][data.allItems[type].length - 1].id + 1;
            } else {
                ID = 0;
            }

            newItem = type === 'exp' ? new Expense(ID, des, val) : new Income(ID, des, val);
            data.allItems[type].push(newItem);
            return newItem;
        },

        deleteItem: function (type, id) {
            var ids = data.allItems[type].map(function (cur) { return cur.id; });
            var index = ids.indexOf(id);
            if (index !== -1) data.allItems[type].splice(index, 1);
        },

        calculateBudget: function () {
            calculateTotal('exp');
            calculateTotal('inc');
            data.budget = data.totals.inc - data.totals.exp;
            data.percentage = data.totals.inc > 0
                ? Math.round((data.totals.exp / data.totals.inc) * 100)
                : -1;
        },

        calculatePercentages: function () {
            data.allItems.exp.forEach(function (cur) { cur.calcPercentage(data.totals.inc); });
        },

        getPercentages: function () {
            return data.allItems.exp.map(function (cur) { return cur.getPercentage(); });
        },

        getBudget: function () { return data; },

        reset: function () {
            data = { allItems: { exp: [], inc: [] }, totals: { exp: 0, inc: 0 }, budget: 0, percentage: -1 };
        },

        getData: function () { return data; },
        setData: function (newData) { data = newData; }
    };

})();


// ======================
// UI CONTROLLER
// ======================
var UIController = (function () {

    var DOMstrings = {
        inputType: '.add__type',
        inputDescription: '.add__description',
        inputValue: '.add__value',
        inputBtn: '.add__btn',
        incomeContainer: '.income__list',
        expensesContainer: '.expenses__list',
        budgetLabel: '.budget__value',
        incomeLabel: '.budget__income--value',
        expensesLabel: '.budget__expenses--value',
        percentageLabel: '.budget__expenses--percentage',
        container: '.container',
        expensesPercLabel: '.item__percentage',
        dateLabel: '.budget__title--month',
        previousMonthsContainer: '.previous-months'
    };

    var formatNumber = function (num, type) {
        num = Math.abs(num).toFixed(2);
        return (type === 'exp' ? '- ' : '+ ') + num;
    };

    return {
        getInput: function () {
            return {
                type: document.querySelector(DOMstrings.inputType).value,
                description: document.querySelector(DOMstrings.inputDescription).value.trim(),
                value: parseFloat(document.querySelector(DOMstrings.inputValue).value)
            };
        },

        addListItem: function (obj, type) {
            var html, element;
            if (type === 'inc') {
                element = DOMstrings.incomeContainer;
                html = `
                    <div class="item clearfix" id="inc-${obj.id}">
                        <div class="item__description">${obj.description}</div>
                        <div class="right clearfix">
                            <div class="item__value">${formatNumber(obj.value, 'inc')}</div>
                            <div class="item__delete">
                                <button class="item__delete--btn">
                                    <i class="ion-ios-close-outline"></i>
                                </button>
                            </div>
                        </div>
                    </div>`;
            } else {
                element = DOMstrings.expensesContainer;
                html = `
                    <div class="item clearfix" id="exp-${obj.id}">
                        <div class="item__description">${obj.description}</div>
                        <div class="right clearfix">
                            <div class="item__value">${formatNumber(obj.value, 'exp')}</div>
                            <div class="item__percentage">---</div>
                            <div class="item__delete">
                                <button class="item__delete--btn">
                                    <i class="ion-ios-close-outline"></i>
                                </button>
                            </div>
                        </div>
                    </div>`;
            }
            document.querySelector(element).insertAdjacentHTML('beforeend', html);
        },

        deleteListItem: function (selectorID) {
            var el = document.getElementById(selectorID);
            if (el) el.parentNode.removeChild(el);
        },

        clearFields: function () {
            document.querySelector(DOMstrings.inputDescription).value = '';
            document.querySelector(DOMstrings.inputValue).value = '';
            document.querySelector(DOMstrings.inputDescription).focus();
        },

        displayBudget: function (obj) {
            var type = obj.budget >= 0 ? 'inc' : 'exp';
            document.querySelector(DOMstrings.budgetLabel).textContent = formatNumber(obj.budget, type);
            document.querySelector(DOMstrings.incomeLabel).textContent = formatNumber(obj.totals.inc, 'inc');
            document.querySelector(DOMstrings.expensesLabel).textContent = formatNumber(obj.totals.exp, 'exp');
            document.querySelector(DOMstrings.percentageLabel).textContent = obj.percentage > 0 ? obj.percentage + '%' : '---';
        },

        displayPercentages: function (percentages) {
            var fields = document.querySelectorAll(DOMstrings.expensesPercLabel);
            for (var i = 0; i < fields.length; i++) {
                fields[i].textContent = percentages[i] > 0 ? percentages[i] + '%' : '---';
            }
        },

        displayMonth: function () {
            var now = new Date();
            var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            document.querySelector(DOMstrings.dateLabel).textContent = months[now.getMonth()] + ' ' + now.getFullYear();
        },

        showPreviousMonths: function (months) {
            var container = document.querySelector(DOMstrings.previousMonthsContainer);
            container.innerHTML = '';
            if (months.length === 0) {
                container.innerHTML = '<p>No previous months saved.</p>';
                return;
            }
            months.forEach(function (month) {
                var btn = document.createElement('button');
                btn.textContent = month;
                btn.className = 'prev-month-btn';
                container.appendChild(btn);
            });
        },

        getDOMstrings: function () { return DOMstrings; }
    };

})();


// ======================
// GLOBAL CONTROLLER
// ======================
var controller = (function (budgetCtrl, UICtrl) {

    var DOM = UICtrl.getDOMstrings();

    // --- Local Storage ---
    var saveCurrentMonth = function () {
        var now = new Date();
        var monthYear = now.toLocaleString('default', { month: 'long', year: 'numeric' });
        var allData = JSON.parse(localStorage.getItem('allBudgetData')) || {};
        allData[monthYear] = budgetCtrl.getData();
        allData.currentMonth = monthYear;
        localStorage.setItem('allBudgetData', JSON.stringify(allData));
    };

    var loadCurrentMonth = function () {
        var allData = JSON.parse(localStorage.getItem('allBudgetData')) || {};
        var now = new Date();
        var monthYear = now.toLocaleString('default', { month: 'long', year: 'numeric' });

        if (allData[monthYear]) {
            budgetCtrl.setData(allData[monthYear]);
        }
    };

    var getPreviousMonths = function () {
        var allData = JSON.parse(localStorage.getItem('allBudgetData')) || {};
        return Object.keys(allData).filter(k => k !== 'currentMonth');
    };

    // --- Update budget & percentages ---
    var updateBudget = function () {
        budgetCtrl.calculateBudget();
        UICtrl.displayBudget(budgetCtrl.getBudget());
    };

    var updatePercentages = function () {
        budgetCtrl.calculatePercentages();
        UICtrl.displayPercentages(budgetCtrl.getPercentages());
    };

    // --- Add Item ---
    var ctrlAddItem = function () {
        var input = UICtrl.getInput();
        if (input.description !== "" && !isNaN(input.value) && input.value > 0) {
            var newItem = budgetCtrl.addItem(input.type, input.description, input.value);
            UICtrl.addListItem(newItem, input.type);
            UICtrl.clearFields();
            updateBudget();
            updatePercentages();
        }
    };

    // --- Delete Item ---
    var ctrlDeleteItem = function (event) {
        var itemID = event.target.closest('.item')?.id;
        if (itemID) {
            var splitID = itemID.split('-');
            budgetCtrl.deleteItem(splitID[0], parseInt(splitID[1]));
            UICtrl.deleteListItem(itemID);
            updateBudget();
            updatePercentages();
        }
    };

    // --- Reset for New Month ---
    var resetForNewMonth = function () {
        if (confirm('Save current month and start new month?')) {
            saveCurrentMonth();
            budgetCtrl.reset();
            document.querySelector(DOM.incomeContainer).innerHTML = '';
            document.querySelector(DOM.expensesContainer).innerHTML = '';
            updateBudget();
            updatePercentages();
            UICtrl.displayMonth();
            UICtrl.showPreviousMonths(getPreviousMonths());
        }
    };

    // --- View Previous Month ---
    var viewPreviousMonth = function (month) {
        var allData = JSON.parse(localStorage.getItem('allBudgetData')) || {};
        if (allData[month]) {
            budgetCtrl.setData(allData[month]);
            document.querySelector(DOM.incomeContainer).innerHTML = '';
            document.querySelector(DOM.expensesContainer).innerHTML = '';
            var data = budgetCtrl.getData();
            data.allItems.inc.forEach(function (cur) { UICtrl.addListItem(cur, 'inc'); });
            data.allItems.exp.forEach(function (cur) { UICtrl.addListItem(cur, 'exp'); });
            updateBudget();
            updatePercentages();
        }
    };

    // --- Event Listeners ---
    var setupEventListeners = function () {
        document.querySelector(DOM.inputBtn).addEventListener('click', ctrlAddItem);
        document.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') ctrlAddItem();
        });
        document.querySelector(DOM.container).addEventListener('click', ctrlDeleteItem);

        // Next Month Button
        var resetBtn = document.createElement('button');
        resetBtn.textContent = 'Next Month';
        resetBtn.className = 'reset-btn';
        document.querySelector('.budget').appendChild(resetBtn);
        resetBtn.addEventListener('click', resetForNewMonth);

        // Previous Months Panel
        var prevContainer = document.createElement('div');
        prevContainer.className = 'previous-months';
        document.querySelector('.budget').appendChild(prevContainer);

        UICtrl.showPreviousMonths(getPreviousMonths());

        prevContainer.addEventListener('click', function (e) {
            if (e.target.classList.contains('prev-month-btn')) {
                viewPreviousMonth(e.target.textContent);
            }
        });
    };

    return {
        init: function () {
            loadCurrentMonth();
            var data = budgetCtrl.getData();
            data.allItems.inc.forEach(function (cur) { UICtrl.addListItem(cur, 'inc'); });
            data.allItems.exp.forEach(function (cur) { UICtrl.addListItem(cur, 'exp'); });

            updateBudget();
            updatePercentages();
            UICtrl.displayMonth();
            setupEventListeners();
        }
    };

})(budgetController, UIController);

controller.init();
