// ======================
// iBudget (Basic + Advanced)
// - Basic mode: record income/expenses
// - Advanced mode: category limits + risk indicator + savings goal
// ======================

// ----------
// Helpers
// ----------
// Categories are user-defined (advanced mode).
// "Savings" is reserved because we record savings transfers as a special expense.
var RESERVED_CATEGORIES = ['Savings'];

// Internal label for expenses that have no category (e.g., basic mode expenses).
var UNCATEGORIZED = 'Uncategorized';

function normalizeCategory(name) {
    return (name || '').toString().trim().replace(/\s+/g, ' ');
}

function safeNumber(n) {
    var x = parseFloat(n);
    return isNaN(x) ? 0 : x;
}

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

// ======================
// BUDGET CONTROLLER
// ======================
var budgetController = (function () {

    var Expense = function (id, description, value, category, meta) {
        this.id = id;
        this.description = description;
        this.value = value;
        this.category = category || '';
        this.meta = meta || {}; // e.g. { isSavings: true }
    };

    var Income = function (id, description, value) {
        this.id = id;
        this.description = description;
        this.value = value;
    };

    var defaultCategories = function () {
        // limits: categories that have a defined budget cap
        // spent: computed totals by category
        var limits = {};
        var spent = { 'Savings': 0 };
        return { limits: limits, spent: spent };
    };

    var data = {
        allItems: { exp: [], inc: [] },
        totals: { exp: 0, inc: 0 },
        budget: 0,
        percentage: -1,
        categories: defaultCategories(),
        savings: { goal: 0, current: 0 }
    };

    var calculateTotal = function (type) {
        var sum = 0;
        data.allItems[type].forEach(function (cur) {
            sum += cur.value;
        });
        data.totals[type] = sum;
    };

    var recalcCategorySpent = function () {
        // reset spent for known categories
        var nextSpent = {};
        // ensure reserved
        nextSpent['Savings'] = 0;

        Object.keys(data.categories.limits || {}).forEach(function (k) {
            nextSpent[k] = 0;
        });

        // sum all expenses by category
        data.allItems.exp.forEach(function (e) {
            var cat = normalizeCategory(e.category) || UNCATEGORIZED;
            if (!nextSpent.hasOwnProperty(cat)) nextSpent[cat] = 0;
            nextSpent[cat] += e.value;
        });

        data.categories.spent = nextSpent;
    };

    var saveData = function () {
        localStorage.setItem('budgetData', JSON.stringify(data));
    };

    var migrateIfNeeded = function () {
        // old versions may not have categories / savings
        if (!data.categories || !data.categories.limits || !data.categories.spent) {
            data.categories = defaultCategories();
        }

        // Remove old preset "Others" if present from older versions
        if (data.categories && data.categories.limits && data.categories.limits.hasOwnProperty('Others')) {
            delete data.categories.limits['Others'];
        }
        if (data.categories && data.categories.spent && data.categories.spent.hasOwnProperty('Others')) {
            delete data.categories.spent['Others'];
        }

        // ensure reserved keys exist
        if (data.categories.spent['Savings'] === undefined) data.categories.spent['Savings'] = 0;

        if (!data.savings) data.savings = { goal: 0, current: 0 };
        if (data.savings.goal === undefined) data.savings.goal = 0;
        if (data.savings.current === undefined) data.savings.current = 0;

        // ensure expense items have category
        if (data.allItems && data.allItems.exp) {
            data.allItems.exp.forEach(function (e) {
                // In older versions, missing/blank categories existed. Keep them blank
                // so they fall under UNCATEGORIZED when we compute summaries.
                var c = normalizeCategory(e.category);
                // Convert old preset "Others" to blank so it becomes Uncategorized.
                if (c === 'Others') c = '';
                e.category = c || '';
                if (!e.meta) e.meta = {};
            });
        }
        recalcCategorySpent();
        saveData();
    };

    var loadData = function () {
        var stored = localStorage.getItem('budgetData');
        if (stored) {
            data = JSON.parse(stored);
            migrateIfNeeded();
        }
    };

    var resetData = function () {
        data = {
            allItems: { exp: [], inc: [] },
            totals: { exp: 0, inc: 0 },
            budget: 0,
            percentage: -1,
            categories: defaultCategories(),
            savings: { goal: 0, current: 0 }
        };
        localStorage.removeItem('budgetData');
    };

    var nextId = function (type) {
        if (data.allItems[type].length > 0) {
            return data.allItems[type][data.allItems[type].length - 1].id + 1;
        }
        return 0;
    };

    return {
        addItem: function (type, des, val, category, meta) {
            var newItem;
            var ID = nextId(type);

            if (type === 'exp') {
                // In basic mode, category is blank. In advanced mode, we pass a user-provided category.
                var cat = normalizeCategory(category) || '';
                newItem = new Expense(ID, des, val, cat, meta);
            } else {
                newItem = new Income(ID, des, val);
            }

            data.allItems[type].push(newItem);
            if (type === 'exp') recalcCategorySpent();
            saveData();
            return newItem;
        },

        deleteItem: function (type, id) {
            var ids = data.allItems[type].map(function (cur) { return cur.id; });
            var index = ids.indexOf(id);
            if (index !== -1) {
                var removed = data.allItems[type][index];
                data.allItems[type].splice(index, 1);

                // if user deletes a savings transfer, also rollback the savings counter
                if (type === 'exp' && removed && removed.meta && removed.meta.isSavings) {
                    data.savings.current = Math.max(0, safeNumber(data.savings.current) - safeNumber(removed.value));
                }

                if (type === 'exp') recalcCategorySpent();
                saveData();
            }
        },

        setCategoryLimit: function (category, limit) {
            var cat = normalizeCategory(category);
            if (!cat) return;
            if (cat.toLowerCase() === 'savings') return; // reserved
            // create/update
            if (!data.categories.limits) data.categories.limits = {};
            data.categories.limits[cat] = Math.max(0, safeNumber(limit));
            if (!data.categories.spent) data.categories.spent = {};
            if (data.categories.spent[cat] === undefined) data.categories.spent[cat] = 0;
            recalcCategorySpent();
            saveData();
        },

        deleteCategory: function (category) {
            var cat = normalizeCategory(category);
            if (!cat) return;
            if (cat.toLowerCase() === 'savings') return;

            // move any existing expenses in this category to blank (UNCATEGORIZED)
            data.allItems.exp.forEach(function (e) {
                if (normalizeCategory(e.category) === cat) {
                    e.category = '';
                }
            });

            if (data.categories.limits && data.categories.limits.hasOwnProperty(cat)) {
                delete data.categories.limits[cat];
            }
            if (data.categories.spent && data.categories.spent.hasOwnProperty(cat)) {
                delete data.categories.spent[cat];
            }
            recalcCategorySpent();
            saveData();
        },

        getCategorySummary: function () {
            // union of (limits keys) and (spent keys), excluding Savings
            var namesMap = {};
            Object.keys(data.categories.limits || {}).forEach(function (k) { namesMap[normalizeCategory(k)] = true; });
            Object.keys(data.categories.spent || {}).forEach(function (k) {
                var kk = normalizeCategory(k);
                if (!kk) kk = UNCATEGORIZED;
                namesMap[kk] = true;
            });
            namesMap['Savings'] = false;

            var names = Object.keys(namesMap).filter(function (k) {
                return namesMap[k] && normalizeCategory(k) && normalizeCategory(k) !== 'Savings';
            });

            names.sort(function (a, b) { return a.localeCompare(b); });

            return names.map(function (c) {
                var limit = safeNumber((data.categories.limits || {})[c]);
                var spent = safeNumber((data.categories.spent || {})[c]);
                return {
                    category: c,
                    limit: limit,
                    spent: spent,
                    isOver: limit > 0 && spent > limit
                };
            });
        },

        addSavings: function (amount) {
            var a = safeNumber(amount);
            if (a <= 0) return null;

            // record as an expense so that available budget reflects it
            var item = this.addItem('exp', 'Savings', a, 'Savings', { isSavings: true });
            data.savings.current = safeNumber(data.savings.current) + a;
            saveData();
            return item;
        },

        setSavingsGoal: function (goal) {
            data.savings.goal = Math.max(0, safeNumber(goal));
            saveData();
        },

        setSavingsCurrent: function (current) {
            data.savings.current = Math.max(0, safeNumber(current));
            saveData();
        },

        getSavings: function () {
            return {
                goal: safeNumber(data.savings.goal),
                current: safeNumber(data.savings.current)
            };
        },

        calculateBudget: function () {
            calculateTotal('exp');
            calculateTotal('inc');
            data.budget = data.totals.inc - data.totals.exp;
            if (data.totals.inc > 0) {
                data.percentage = Math.round((data.totals.exp / data.totals.inc) * 100);
            } else {
                data.percentage = -1;
            }
        },

        getBudget: function () {
            return {
                budget: data.budget,
                totalInc: data.totals.inc,
                totalExp: data.totals.exp,
                percentage: data.percentage
            };
        },

        load: loadData,
        reset: resetData,
        getData: function () { return data; }
    };

})();

// ======================
// UI CONTROLLER
// ======================
var UIController = (function () {

    var DOMstrings = {
        inputType: '.add__type',
        inputCategory: '.add__category',
        inputCategoryHint: '.add__category-hint',
        categoryDatalist: '#category-list',
        inputDescription: '.add__description',
        inputValue: '.add__value',
        inputBtn: '.add__btn',

        incomeContainer: '.income__list',
        expensesContainer: '.expenses__list',

        budgetLabel: '.budget__value',
        incomeLabel: '.budget__income--value',
        expensesLabel: '.budget__expenses--value',
        percentageLabel: '.budget__expenses--percentage',
        dateLabel: '.budget__title--month',

        container: '.container',
        resetBtn: '.reset-btn',
        downloadBtn: '.download-btn',

        advancedToggleBtn: '.advanced-toggle-btn',
        advancedStatus: '.advanced-status',
        riskLevel: '.risk-level',
        advancedWarning: '.advanced-warning',

        advancedPanels: '.advanced-panels',
        categoryLimitsList: '.category-limits__list',

        categoryAddName: '.category-add__name',
        categoryAddLimit: '.category-add__limit',
        categoryAddBtn: '.category-add__btn',

        savingsGoal: '.savings__goal',
        savingsCurrent: '.savings__current',
        savingsProgressFill: '.savings-progress__fill',
        savingsProgressText: '.savings-progress__text',
        savingsAdd: '.savings__add',
        savingsAddBtn: '.savings__addbtn'
    };

    var formatCurrency = function (num, type) {
        var n = Math.abs(num).toFixed(2);
        return (type === 'exp' ? '- ₱' : '+ ₱') + n;
    };

    var setHidden = function (selector, hidden) {
        var el = document.querySelector(selector);
        if (!el) return;
        if (hidden) el.setAttribute('hidden', '');
        else el.removeAttribute('hidden');
    };

    var escapeHtml = function (s) {
        return String(s)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    };

    return {
        getInput: function () {
            var type = document.querySelector(DOMstrings.inputType).value;
            var categoryEl = document.querySelector(DOMstrings.inputCategory);
            // In basic mode, the category field is hidden, so we store blank.
            var category = categoryEl && !categoryEl.hasAttribute('hidden') ? normalizeCategory(categoryEl.value) : '';
            return {
                type: type,
                category: category,
                description: document.querySelector(DOMstrings.inputDescription).value.trim(),
                value: parseFloat(document.querySelector(DOMstrings.inputValue).value)
            };
        },

        addListItem: function (obj, type) {
            var html, element;

            if (type === 'inc') {
                element = DOMstrings.incomeContainer;
                html = `<div class="item clearfix" id="inc-${obj.id}">
                        <div class="item__description">${escapeHtml(obj.description)}</div>
                        <div class="right clearfix">
                            <div class="item__value">${formatCurrency(obj.value, 'inc')}</div>
                            <div class="item__delete">
                                <button class="item__delete--btn" aria-label="Delete">×</button>
                            </div>
                        </div>
                    </div>`;
            } else {
                element = DOMstrings.expensesContainer;
                var badge = obj.category ? `<span class="cat-badge">${escapeHtml(obj.category)}</span>` : '';
                html = `<div class="item clearfix" id="exp-${obj.id}">
                        <div class="item__description">${badge}${escapeHtml(obj.description)}</div>
                        <div class="right clearfix">
                            <div class="item__value">${formatCurrency(obj.value, 'exp')}</div>
                            <div class="item__delete">
                                <button class="item__delete--btn" aria-label="Delete">×</button>
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
        },

        renderCategoryDatalist: function (names) {
            var dl = document.querySelector(DOMstrings.categoryDatalist);
            if (!dl) return;
            dl.innerHTML = '';
            (names || []).forEach(function (n) {
                var opt = document.createElement('option');
                opt.value = n;
                dl.appendChild(opt);
            });
        },

        displayBudget: function (obj) {
            var type = obj.budget >= 0 ? 'inc' : 'exp';
            document.querySelector(DOMstrings.budgetLabel).textContent = formatCurrency(obj.budget, type);
            document.querySelector(DOMstrings.incomeLabel).textContent = formatCurrency(obj.totalInc, 'inc');
            document.querySelector(DOMstrings.expensesLabel).textContent = formatCurrency(obj.totalExp, 'exp');
            document.querySelector(DOMstrings.percentageLabel).textContent = obj.percentage > 0 ? obj.percentage + '%' : '---';
        },

        displayMonth: function () {
            var now = new Date();
            var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            document.querySelector(DOMstrings.dateLabel).textContent = months[now.getMonth()] + ' ' + now.getFullYear();
        },

        setAdvancedMode: function (isAdvanced) {
            var btn = document.querySelector(DOMstrings.advancedToggleBtn);
            if (btn) {
                btn.textContent = isAdvanced ? 'Back to Basic Mode' : 'Advanced Mode';
                btn.setAttribute('aria-pressed', isAdvanced ? 'true' : 'false');
            }
            setHidden(DOMstrings.advancedStatus, !isAdvanced);
            setHidden(DOMstrings.advancedPanels, !isAdvanced);

            // show category selector only when advanced AND expense selected
            this.syncCategorySelector(isAdvanced);
        },

        syncCategorySelector: function (isAdvanced) {
            var type = document.querySelector(DOMstrings.inputType)?.value;
            var show = isAdvanced && type === 'exp';
            setHidden(DOMstrings.inputCategory, !show);
            setHidden(DOMstrings.inputCategoryHint, !show);
        },

        displayRisk: function (percentage) {
            var el = document.querySelector(DOMstrings.riskLevel);
            if (!el) return;

            if (percentage < 0) {
                el.textContent = '---';
                el.dataset.risk = 'unknown';
                return;
            }

            var risk = 'low';
            if (percentage >= 70) risk = 'high';
            else if (percentage >= 40) risk = 'medium';

            el.dataset.risk = risk;
            el.textContent = risk.toUpperCase();
        },

        displayWarning: function (message) {
            var warn = document.querySelector(DOMstrings.advancedWarning);
            if (!warn) return;
            if (!message) {
                warn.textContent = '';
                warn.setAttribute('hidden', '');
                return;
            }
            warn.textContent = message;
            warn.removeAttribute('hidden');
        },

        renderCategoryLimits: function (summary, limitsMap) {
            var list = document.querySelector(DOMstrings.categoryLimitsList);
            if (!list) return;
            list.innerHTML = '';

            summary.forEach(function (row) {
                var limitVal = limitsMap && limitsMap[row.category] !== undefined ? limitsMap[row.category] : row.limit;
                // Avoid deleting the system bucket used for blank categories.
                var canDelete = row.category !== UNCATEGORIZED;
                var html = `
                    <div class="category-limit ${row.isOver ? 'is-over' : ''}" data-category="${escapeHtml(row.category)}">
                        <div class="category-limit__name">${escapeHtml(row.category)}</div>
                        <div>
                            <input class="category-limit__input" type="number" min="0" placeholder="0" value="${safeNumber(limitVal)}" />
                        </div>
                        <div class="category-limit__spent">₱${safeNumber(row.spent).toFixed(2)}</div>
                        <div>
                            ${canDelete ? '<button class="category-limit__delete" type="button" aria-label="Delete category">×</button>' : ''}
                        </div>
                    </div>
                `;
                list.insertAdjacentHTML('beforeend', html);
            });
        },

        renderCategoryDatalist: function (summary) {
            var dl = document.querySelector(DOMstrings.categoryDatalist);
            if (!dl) return;
            dl.innerHTML = '';

            // Build options from summary (which already includes 'Others')
            summary.forEach(function (row) {
                var opt = document.createElement('option');
                opt.value = row.category;
                dl.appendChild(opt);
            });
        },

        displaySavings: function (savings) {
            var goalEl = document.querySelector(DOMstrings.savingsGoal);
            var currentEl = document.querySelector(DOMstrings.savingsCurrent);
            if (!goalEl || !currentEl) return;

            goalEl.value = savings.goal ? savings.goal : '';
            currentEl.value = savings.current ? savings.current : '';

            var pct = 0;
            if (savings.goal > 0) pct = clamp((savings.current / savings.goal) * 100, 0, 100);
            var fill = document.querySelector(DOMstrings.savingsProgressFill);
            var text = document.querySelector(DOMstrings.savingsProgressText);
            if (fill) fill.style.width = pct.toFixed(0) + '%';
            if (text) text.textContent = (savings.goal > 0 ? pct.toFixed(0) + '% of goal' : 'Set a goal to track your progress');
        },

        getDOMstrings: function () { return DOMstrings; }
    };

})();

// ======================
// GLOBAL CONTROLLER
// ======================
var controller = (function (budgetCtrl, UICtrl) {

    var DOM = UICtrl.getDOMstrings();
    var isAdvanced = false;

    var getSavedAdvancedMode = function () {
        var stored = localStorage.getItem('advancedMode');
        if (stored === 'true') return true;
        if (window.location.hash === '#advanced') return true;
        return false;
    };

    var setSavedAdvancedMode = function (val) {
        localStorage.setItem('advancedMode', val ? 'true' : 'false');
        if (val) window.location.hash = 'advanced';
        else if (window.location.hash === '#advanced') window.location.hash = '';
    };

    var updateAdvancedOutputs = function () {
        // risk
        var b = budgetCtrl.getBudget();
        UICtrl.displayRisk(b.percentage);

        // category limits + warnings
        var data = budgetCtrl.getData();
        var summary = budgetCtrl.getCategorySummary();
        UICtrl.renderCategoryLimits(summary, data.categories.limits);
        UICtrl.renderCategoryDatalist(summary);

        var overs = summary.filter(function (r) { return r.isOver; });
        if (overs.length > 0) {
            var first = overs[0];
            UICtrl.displayWarning(`You have exceeded your budget for ${first.category}.`);
        } else {
            UICtrl.displayWarning('');
        }

        // savings
        UICtrl.displaySavings(budgetCtrl.getSavings());
    };

    var updateBudget = function () {
        budgetCtrl.calculateBudget();
        UICtrl.displayBudget(budgetCtrl.getBudget());
        if (isAdvanced) updateAdvancedOutputs();
    };

    var ctrlAddItem = function () {
        var input = UICtrl.getInput();
        // In advanced mode, require a category name for expenses so limits/warnings work.
        if (isAdvanced && input.type === 'exp' && !normalizeCategory(input.category)) {
            UICtrl.displayWarning('Please enter a category name (used for Budget Category limits & warnings).');
            return;
        }
        if (input.description !== "" && !isNaN(input.value) && input.value > 0) {
            var newItem = budgetCtrl.addItem(input.type, input.description, input.value, input.category);
            UICtrl.addListItem(newItem, input.type);
            UICtrl.clearFields();
            updateBudget();
        }
    };

    var ctrlDeleteItem = function (event) {
        if (event.target.classList.contains('item__delete--btn')) {
            var itemID = event.target.closest('.item')?.id;
            if (itemID) {
                var splitID = itemID.split('-');
                budgetCtrl.deleteItem(splitID[0], parseInt(splitID[1]));
                UICtrl.deleteListItem(itemID);
                updateBudget();
            }
        }
    };

    var downloadCSV = function () {
        var data = budgetCtrl.getData();
        var csvContent = 'Type,Category,Description,Value\n';
        data.allItems.inc.forEach(function (item) {
            csvContent += `Income,,${item.description},${item.value}\n`;
        });
        data.allItems.exp.forEach(function (item) {
            var cat = item.category || 'Others';
            csvContent += `Expense,${cat},${item.description},${item.value}\n`;
        });
        var blob = new Blob([csvContent], { type: 'text/csv' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'budget_data.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    var toggleAdvanced = function () {
        isAdvanced = !isAdvanced;
        setSavedAdvancedMode(isAdvanced);
        UICtrl.setAdvancedMode(isAdvanced);
        if (isAdvanced) updateAdvancedOutputs();
    };

    var onTypeChange = function () {
        UICtrl.syncCategorySelector(isAdvanced);
    };

    var onCategoryLimitInput = function (event) {
        if (!event.target.classList.contains('category-limit__input')) return;
        var row = event.target.closest('.category-limit');
        var cat = row ? row.getAttribute('data-category') : null;
        if (!cat) return;
        budgetCtrl.setCategoryLimit(cat, event.target.value);
        updateAdvancedOutputs();
    };

    var onCategoryListClick = function (event) {
        if (!event.target.classList.contains('category-limit__delete')) return;
        var row = event.target.closest('.category-limit');
        var cat = row ? row.getAttribute('data-category') : null;
        if (!cat) return;
        budgetCtrl.deleteCategory(cat);
        updateBudget();
    };

    var onAddOrUpdateCategory = function () {
        var nameEl = document.querySelector(DOM.categoryAddName);
        var limitEl = document.querySelector(DOM.categoryAddLimit);
        var name = normalizeCategory(nameEl?.value);
        var limit = safeNumber(limitEl?.value);
        if (!name) return;
        if (name.toLowerCase() === 'savings') return;

        budgetCtrl.setCategoryLimit(name, limit);
        if (nameEl) nameEl.value = '';
        if (limitEl) limitEl.value = '';
        updateAdvancedOutputs();
    };

    var onSavingsGoalChange = function () {
        var val = document.querySelector(DOM.savingsGoal)?.value;
        budgetCtrl.setSavingsGoal(val);
        updateAdvancedOutputs();
    };

    var onSavingsCurrentChange = function () {
        var val = document.querySelector(DOM.savingsCurrent)?.value;
        budgetCtrl.setSavingsCurrent(val);
        updateAdvancedOutputs();
    };

    var onAddSavings = function () {
        var amtEl = document.querySelector(DOM.savingsAdd);
        var amt = safeNumber(amtEl?.value);
        if (amt <= 0) return;

        // prevent savings transfer if it would make budget negative
        budgetCtrl.calculateBudget();
        var b = budgetCtrl.getBudget();
        if (b.budget - amt < 0) {
            UICtrl.displayWarning('Not enough available budget to add that amount to savings.');
            return;
        }

        var item = budgetCtrl.addSavings(amt);
        if (item) {
            UICtrl.addListItem(item, 'exp');
            amtEl.value = '';
            updateBudget();
        }
    };

    var setupEventListeners = function () {
        document.querySelector(DOM.inputBtn).addEventListener('click', ctrlAddItem);
        document.addEventListener('keypress', function (e) { if (e.key === 'Enter') ctrlAddItem(); });

        document.querySelector(DOM.container).addEventListener('click', ctrlDeleteItem);
        document.querySelector(DOM.resetBtn).addEventListener('click', function () {
            if (confirm('Reset all data?')) {
                budgetCtrl.reset();
                document.querySelector(DOM.incomeContainer).innerHTML = '';
                document.querySelector(DOM.expensesContainer).innerHTML = '';
                updateBudget();
                if (isAdvanced) updateAdvancedOutputs();
            }
        });
        document.querySelector(DOM.downloadBtn).addEventListener('click', downloadCSV);

        // advanced toggle
        document.querySelector(DOM.advancedToggleBtn).addEventListener('click', toggleAdvanced);

        // show/hide category selector based on type
        document.querySelector(DOM.inputType).addEventListener('change', onTypeChange);

        // category limits input
        // Use change/focusout instead of input to avoid re-rendering on every keystroke
        // (which can steal focus and make it feel like you can only type 1 digit).
        document.querySelector(DOM.categoryLimitsList).addEventListener('change', onCategoryLimitInput);
        document.querySelector(DOM.categoryLimitsList).addEventListener('focusout', onCategoryLimitInput);
        document.querySelector(DOM.categoryLimitsList).addEventListener('click', onCategoryListClick);

        // add / update category limit
        document.querySelector(DOM.categoryAddBtn).addEventListener('click', onAddOrUpdateCategory);

        // savings
        document.querySelector(DOM.savingsGoal).addEventListener('input', onSavingsGoalChange);
        document.querySelector(DOM.savingsCurrent).addEventListener('input', onSavingsCurrentChange);
        document.querySelector(DOM.savingsAddBtn).addEventListener('click', onAddSavings);
    };

    return {
        init: function () {
            UICtrl.displayMonth();
            budgetCtrl.load();

            // render existing items
            var data = budgetCtrl.getData();
            data.allItems.inc.forEach(function (item) { UICtrl.addListItem(item, 'inc'); });
            data.allItems.exp.forEach(function (item) { UICtrl.addListItem(item, 'exp'); });

            // initial budgets
            updateBudget();

            // advanced initial state
            isAdvanced = getSavedAdvancedMode();
            UICtrl.setAdvancedMode(isAdvanced);
            if (isAdvanced) updateAdvancedOutputs();

            setupEventListeners();
        }
    };

})(budgetController, UIController);

controller.init();
