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
        data.totals[type] = data.allItems[type]
            .reduce((sum, cur) => sum + cur.value, 0);
    };

    // ===== LOCAL STORAGE =====
    var saveData = function () {
        localStorage.setItem('budgetData', JSON.stringify(data));
    };

    var loadData = function () {
        var stored = localStorage.getItem('budgetData');
        if (stored) data = JSON.parse(stored);
    };

    var resetData = function () {
        data = {
            allItems: { exp: [], inc: [] },
            totals: { exp: 0, inc: 0 },
            budget: 0,
            percentage: -1
        };
        localStorage.removeItem('budgetData');
    };

    return {
        addItem(type, desc, val) {
            var ID = data.allItems[type].length
                ? data.allItems[type][data.allItems[type].length - 1].id + 1
                : 0;

            var newItem = type === 'exp'
                ? new Expense(ID, desc, val)
                : new Income(ID, desc, val);

            data.allItems[type].push(newItem);
            saveData();
            return newItem;
        },

        deleteItem(type, id) {
            data.allItems[type] =
                data.allItems[type].filter(item => item.id !== id);
            saveData();
        },

        calculateBudget() {
            calculateTotal('inc');
            calculateTotal('exp');
            data.budget = data.totals.inc - data.totals.exp;
            data.percentage = data.totals.inc > 0
                ? Math.round((data.totals.exp / data.totals.inc) * 100)
                : -1;
        },

        calculatePercentages() {
            data.allItems.exp.forEach(e =>
                e.calcPercentage(data.totals.inc));
        },

        getBudget() {
            return {
                budget: data.budget,
                totalInc: data.totals.inc,
                totalExp: data.totals.exp,
                percentage: data.percentage
            };
        },

        load: loadData,
        reset: resetData,
        getData: () => data
    };

})();


// ======================
// UI CONTROLLER
// ======================
var UIController = (function () {

    var DOM = {
        inputType: '.add__type',
        inputDesc: '.add__description',
        inputValue: '.add__value',
        inputBtn: '.add__btn',
        incList: '.income__list',
        expList: '.expenses__list',
        budgetLabel: '.budget__value',
        incLabel: '.budget__income--value',
        expLabel: '.budget__expenses--value',
        percLabel: '.budget__expenses--percentage',
        container: '.container',
        month: '.budget__title--month'
    };

    var formatNumber = function (num, type) {
        num = Math.abs(num).toFixed(2);
        return (type === 'exp' ? '- ' : '+ ') + num;
    };

    return {
        getInput() {
            return {
                type: document.querySelector(DOM.inputType).value,
                description: document.querySelector(DOM.inputDesc).value.trim(),
                value: Number(document.querySelector(DOM.inputValue).value)
            };
        },

        addListItem(obj, type) {
            var element = type === 'inc' ? DOM.incList : DOM.expList;
            var html = `
            <div class="item clearfix" id="${type}-${obj.id}">
                <div class="item__description">
                    ${obj.description}
                    <span class="delete-x">X</span>
                </div>
                <div class="right clearfix">
                    <div class="item__value">${formatNumber(obj.value, type)}</div>
                    ${type === 'exp' ? '<div class="item__percentage">---</div>' : ''}
                </div>
            </div>`;
            document.querySelector(element).insertAdjacentHTML('beforeend', html);
        },

        deleteListItem(id) {
            document.getElementById(id)?.remove();
        },

        clearFields() {
            document.querySelector(DOM.inputDesc).value = '';
            document.querySelector(DOM.inputValue).value = '';
        },

        clearLists() {
            document.querySelector(DOM.incList).innerHTML = '';
            document.querySelector(DOM.expList).innerHTML = '';
        },

        displayBudget(obj) {
            var type = obj.budget >= 0 ? 'inc' : 'exp';
            document.querySelector(DOM.budgetLabel).textContent =
                formatNumber(obj.budget, type);
            document.querySelector(DOM.incLabel).textContent =
                formatNumber(obj.totalInc, 'inc');
            document.querySelector(DOM.expLabel).textContent =
                formatNumber(obj.totalExp, 'exp');
            document.querySelector(DOM.percLabel).textContent =
                obj.percentage > 0 ? obj.percentage + '%' : '---';
        },

        displayMonth() {
            var now = new Date();
            var months = [
                'January','February','March','April','May','June',
                'July','August','September','October','November','December'
            ];
            document.querySelector(DOM.month).textContent =
                months[now.getMonth()] + ' ' + now.getFullYear();
        },

        addResetButton() {
            let btn = document.querySelector('.reset-btn');
            if (!btn) {
                btn = document.createElement('button');
                btn.textContent = 'Reset Budget';
                btn.className = 'reset-btn';
                document.querySelector('.budget').appendChild(btn);
            }
            return btn;
        },

        getDOM() { return DOM; }
    };

})();


// ======================
// GLOBAL CONTROLLER
// ======================
var controller = (function (B, UI) {

    var updateAll = function () {
        B.calculateBudget();
        UI.displayBudget(B.getBudget());
        B.calculatePercentages();
    };

    var addItem = function () {
        var input = UI.getInput();
        if (input.description && input.value > 0 && !isNaN(input.value)) {
            var item = B.addItem(input.type, input.description, input.value);
            UI.addListItem(item, input.type);
            UI.clearFields();
            updateAll();
        }
    };

    var handleClicks = function (e) {

        // DELETE ITEM
        if (e.target.classList.contains('delete-x')) {
            var id = e.target.closest('.item').id;
            var split = id.split('-');
            B.deleteItem(split[0], parseInt(split[1]));
            UI.deleteListItem(id);
            updateAll();
        }

        // RESET BUDGET
        if (e.target.classList.contains('reset-btn')) {
            if (confirm('Reset all data?')) {
                B.reset();
                UI.clearLists();
                updateAll();
            }
        }
    };

    return {
        init() {
            UI.displayMonth();
            B.load();

            var data = B.getData();
            data.allItems.inc.forEach(i => UI.addListItem(i, 'inc'));
            data.allItems.exp.forEach(i => UI.addListItem(i, 'exp'));
            updateAll();

            document.querySelector(UI.getDOM().inputBtn)
                .addEventListener('click', addItem);

            document.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') addItem();
            });

            document.addEventListener('click', handleClicks);

            UI.addResetButton();
        }
    };

})(budgetController, UIController);

controller.init();
