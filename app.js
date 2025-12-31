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
    var saveData = () =>
        localStorage.setItem('budgetData', JSON.stringify(data));

    var loadData = () => {
        const stored = localStorage.getItem('budgetData');
        if (stored) data = JSON.parse(stored);
    };

    var resetData = () => {
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
            const ID = data.allItems[type].length
                ? data.allItems[type].at(-1).id + 1
                : 0;

            const newItem = type === 'exp'
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

        getPercentages() {
            return data.allItems.exp.map(e => e.percentage);
        },

        getBudget() {
            return { ...data };
        },

        load,
        reset: resetData,
        getData: () => data
    };

})();


// ======================
// UI CONTROLLER
// ======================
var UIController = (function () {

    var DOM = {
        type: '.add__type',
        desc: '.add__description',
        value: '.add__value',
        btn: '.add__btn',
        incList: '.income__list',
        expList: '.expenses__list',
        container: '.container',
        budget: '.budget__value',
        inc: '.budget__income--value',
        exp: '.budget__expenses--value',
        perc: '.budget__expenses--percentage',
        month: '.budget__title--month'
    };

    var format = (n, t) =>
        `${t === 'exp' ? '-' : '+'} ${Math.abs(n).toFixed(2)}`;

    return {
        getInput() {
            return {
                type: document.querySelector(DOM.type).value,
                desc: document.querySelector(DOM.desc).value,
                value: +document.querySelector(DOM.value).value
            };
        },

        addItem(obj, type) {
            const html = `
            <div class="item clearfix" id="${type}-${obj.id}">
                <div class="item__description">
                    ${obj.description}
                    <span class="delete-x">X</span>
                </div>
                <div class="right clearfix">
                    <div class="item__value">${format(obj.value, type)}</div>
                </div>
            </div>`;

            document
                .querySelector(type === 'inc' ? DOM.incList : DOM.expList)
                .insertAdjacentHTML('beforeend', html);
        },

        clearInputs() {
            document.querySelector(DOM.desc).value = '';
            document.querySelector(DOM.value).value = '';
        },

        removeItem(id) {
            document.getElementById(id)?.remove();
        },

        clearLists() {
            document.querySelector(DOM.incList).innerHTML = '';
            document.querySelector(DOM.expList).innerHTML = '';
        },

        updateBudget(b) {
            document.querySelector(DOM.budget).textContent = format(b.budget, b.budget >= 0 ? 'inc' : 'exp');
            document.querySelector(DOM.inc).textContent = format(b.totals.inc, 'inc');
            document.querySelector(DOM.exp).textContent = format(b.totals.exp, 'exp');
            document.querySelector(DOM.perc).textContent =
                b.percentage > 0 ? `${b.percentage}%` : '---';
        },

        displayMonth() {
            const d = new Date();
            const m = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            document.querySelector(DOM.month).textContent =
                `${m[d.getMonth()]} ${d.getFullYear()}`;
        },

        addResetButton() {
            const btn = document.createElement('button');
            btn.textContent = 'Reset Budget';
            btn.className = 'reset-btn';
            document.querySelector('.budget').appendChild(btn);
            return btn;
        },

        DOM
    };

})();


// ======================
// GLOBAL CONTROLLER
// ======================
var controller = (function (B, UI) {

    const update = () => {
        B.calculateBudget();
        UI.updateBudget(B.getBudget());
    };

    const addItem = () => {
        const i = UI.getInput();
        if (!i.desc || i.value <= 0) return;

        UI.addItem(B.addItem(i.type, i.desc, i.value), i.type);
        UI.clearInputs();
        update();
    };

    const deleteItem = e => {
        if (!e.target.classList.contains('delete-x')) return;
        const id = e.target.closest('.item').id;
        const [type, num] = id.split('-');
        B.deleteItem(type, +num);
        UI.removeItem(id);
        update();
    };

    return {
        init() {
            UI.displayMonth();
            B.load();

            const data = B.getData();
            data.allItems.inc.forEach(i => UI.addItem(i, 'inc'));
            data.allItems.exp.forEach(i => UI.addItem(i, 'exp'));
            update();

            document.querySelector(UI.DOM.btn).addEventListener('click', addItem);
            document.querySelector(UI.DOM.container).addEventListener('click', deleteItem);

            const resetBtn = UI.addResetButton();
            resetBtn.addEventListener('click', () => {
                if (confirm('Reset all budget data?')) {
                    B.reset();
                    UI.clearLists();
                    update();
                }
            });
        }
    };

})(budgetController, UIController);

controller.init();
