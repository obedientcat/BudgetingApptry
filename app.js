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

        getData: function () { return data; }
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
        budgetContainer: '.budget'
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

        getDOMstrings: function () { return DOMstrings; },

        createSaveCSVButton: function () {
            var btn = document.createElement('button');
            btn.textContent = 'Save CSV';
            btn.className = 'save-csv-btn';
            document.querySelector(DOMstrings.budgetContainer).appendChild(btn);
            return btn;
        }
    };

})();

// ======================
// GLOBAL CONTROLLER
// ======================
var controller = (function (budgetCtrl, UICtrl) {

    var setupEventListeners = function () {
        var DOM = UICtrl.getDOMstrings();

        document.querySelector(DOM.inputBtn).addEventListener('click', ctrlAddItem);
        document.addEventListener('keypress', function (e) { if (e.key === 'Enter') ctrlAddItem(); });
        document.querySelector(DOM.container).addEventListener('click', ctrlDeleteItem);

        // RESET BUTTON
        var resetBtn = document.createElement('button');
        resetBtn.textContent = 'Reset Budget';
        resetBtn.className = 'reset-btn';
        document.querySelector(DOM.budgetContainer).appendChild(resetBtn);

        resetBtn.addEventListener('click', function () {
            if (confirm('Reset all data?')) {
                budgetCtrl.reset();
                document.querySelector('.income__list').innerHTML = '';
                document.querySelector('.expenses__list').innerHTML = '';
                updateBudget();
                updatePercentages();
            }
        });

        // SAVE CSV BUTTON
        var saveBtn = UICtrl.createSaveCSVButton();
        saveBtn.addEventListener('click', function () {
            saveDataAsCSV();
        });
    };

    var updateBudget = function () {
        budgetCtrl.calculateBudget();
        UICtrl.displayBudget(budgetCtrl.getBudget());
    };

    var updatePercentages = function () {
        budgetCtrl.calculatePercentages();
        UICtrl.displayPercentages(budgetCtrl.getPercentages());
    };

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

    // ======================
    // SAVE CSV FUNCTION
    // ======================
    var saveDataAsCSV = function () {
        var data = budgetCtrl.getData();
        var csvContent = "Type,Description,Value,Percentage\n";

        data.allItems.inc.forEach(function (item) {
            csvContent += `Income,${item.description},${item.value},\n`;
        });
        data.allItems.exp.forEach(function (item) {
            csvContent += `Expense,${item.description},${item.value},${item.percentage >= 0 ? item.percentage : ''}\n`;
        });

        var blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        var link = document.createElement("a");
        var url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "budget_data.csv");
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return {
        init: function () {
            UICtrl.displayMonth();
            updateBudget();
            updatePercentages();
            setupEventListeners();
        }
    };

})(budgetController, UIController);

controller.init();
