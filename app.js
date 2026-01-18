 // ======================
 // BUDGET CONTROLLER
 // ======================
 var budgetController = (function () {
 
-    var Expense = function (id, description, value) {
+    var Expense = function (id, description, value, category) {
         this.id = id;
         this.description = description;
         this.value = value;
+        this.category = category || '';
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
-        percentage: -1
+        percentage: -1,
+        categoryLimits: {},
+        savings: []
     };
 
     var calculateTotal = function (type) {
         var sum = 0;
         data.allItems[type].forEach(function (cur) {
             sum += cur.value;
         });
         data.totals[type] = sum;
     };
 
+    var calculateCategoryTotals = function () {
+        var totals = {};
+        data.allItems.exp.forEach(function (item) {
+            if (!item.category) return;
+            if (!totals[item.category]) totals[item.category] = 0;
+            totals[item.category] += item.value;
+        });
+        return totals;
+    };
+
     var saveData = function () {
         localStorage.setItem('budgetData', JSON.stringify(data));
     };
 
     var loadData = function () {
         var stored = localStorage.getItem('budgetData');
-        if (stored) data = JSON.parse(stored);
+        if (stored) {
+            data = JSON.parse(stored);
+            data.allItems = data.allItems || { exp: [], inc: [] };
+            data.totals = data.totals || { exp: 0, inc: 0 };
+            data.categoryLimits = data.categoryLimits || {};
+            data.savings = data.savings || [];
+            data.budget = data.budget || 0;
+            data.percentage = typeof data.percentage === 'number' ? data.percentage : -1;
+        }
     };
 
     var resetData = function () {
         data = {
             allItems: { exp: [], inc: [] },
             totals: { exp: 0, inc: 0 },
             budget: 0,
-            percentage: -1
+            percentage: -1,
+            categoryLimits: {},
+            savings: []
         };
         localStorage.removeItem('budgetData');
     };
 
+    var getNextSavingsId = function () {
+        if (data.savings.length === 0) return 0;
+        return data.savings[data.savings.length - 1].id + 1;
+    };
+
     return {
-        addItem: function (type, des, val) {
+        addItem: function (type, des, val, category) {
             var newItem, ID;
 
             if (data.allItems[type].length > 0) {
                 ID = data.allItems[type][data.allItems[type].length - 1].id + 1;
             } else {
                 ID = 0;
             }
 
             if (type === 'exp') {
-                newItem = new Expense(ID, des, val);
+                newItem = new Expense(ID, des, val, category);
             } else {
                 newItem = new Income(ID, des, val);
             }
 
             data.allItems[type].push(newItem);
             saveData();
             return newItem;
         },
 
         deleteItem: function (type, id) {
             var ids = data.allItems[type].map(function (cur) {
                 return cur.id;
             });
             var index = ids.indexOf(id);
             if (index !== -1) {
                 data.allItems[type].splice(index, 1);
                 saveData();
             }
         },
 
+        setCategoryLimit: function (category, limit) {
+            data.categoryLimits[category] = limit;
+            saveData();
+        },
+
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
 
+        addSavingsGoal: function (name, target) {
+            var goal = {
+                id: getNextSavingsId(),
+                name: name,
+                target: target,
+                saved: 0
+            };
+            data.savings.push(goal);
+            saveData();
+            return goal;
+        },
+
+        addSavingsContribution: function (id, amount) {
+            var goal = data.savings.find(function (item) { return item.id === id; });
+            if (goal) {
+                goal.saved += amount;
+                saveData();
+            }
+            return goal;
+        },
+
         getBudget: function () {
             return {
                 budget: data.budget,
                 totalInc: data.totals.inc,
                 totalExp: data.totals.exp,
                 percentage: data.percentage
             };
         },
 
+        getCategorySummary: function () {
+            return {
+                limits: data.categoryLimits,
+                totals: calculateCategoryTotals()
+            };
+        },
+
+        getSavings: function () {
+            return data.savings.slice();
+        },
+
         load: loadData,
         reset: resetData,
         getData: function () {
             return data;
         }
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
+        inputCategory: '.add__category',
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
         resetBtn: '.reset-btn',
-        downloadBtn: '.download-btn'
+        downloadBtn: '.download-btn',
+        summaryIncome: '.summary__income',
+        summaryExpenses: '.summary__expenses',
+        summaryBalance: '.summary__balance',
+        summaryMonth: '.summary__month',
+        pieChart: '.pie__chart',
+        pieIncome: '.pie__income',
+        pieExpense: '.pie__expense',
+        categoryName: '.category__name',
+        categoryLimit: '.category__limit',
+        categoryBtn: '.category__btn',
+        categoryList: '.category__list',
+        categoryWarning: '.category__warning',
+        riskLevel: '.risk__level',
+        riskDetails: '.risk__details',
+        savingsName: '.savings__name',
+        savingsTarget: '.savings__target',
+        savingsAddBtn: '.savings__add-btn',
+        savingsList: '.savings__list',
+        savingsSelect: '.savings__select',
+        savingsAmount: '.savings__amount',
+        savingsContributeBtn: '.savings__contribute-btn'
     };
 
     var formatNumber = function (num, type) {
         num = Math.abs(num).toFixed(2);
         return (type === 'exp' ? '- ₱' : '+ ₱') + num;
     };
 
+    var setText = function (selector, value) {
+        var el = document.querySelector(selector);
+        if (el) {
+            el.textContent = value;
+        }
+    };
+
     return {
         getInput: function () {
+            var categoryInput = document.querySelector(DOMstrings.inputCategory);
             return {
                 type: document.querySelector(DOMstrings.inputType).value,
                 description: document.querySelector(DOMstrings.inputDescription).value.trim(),
-                value: parseFloat(document.querySelector(DOMstrings.inputValue).value)
+                value: parseFloat(document.querySelector(DOMstrings.inputValue).value),
+                category: categoryInput ? categoryInput.value.trim() : ''
             };
         },
 
         addListItem: function (obj, type) {
-            var html, element;
+            var html, element, categoryHtml;
 
             if (type === 'inc') {
                 element = DOMstrings.incomeContainer;
                 html = `<div class="item clearfix" id="inc-${obj.id}">
                         <div class="item__description">${obj.description}</div>
                         <div class="right clearfix">
                             <div class="item__value">${formatNumber(obj.value, 'inc')}</div>
                             <div class="item__delete">
                                 <button class="item__delete--btn">×</button>
                             </div>
                         </div>
                     </div>`;
             } else {
                 element = DOMstrings.expensesContainer;
+                categoryHtml = obj.category ? `<div class="item__category">${obj.category}</div>` : '';
                 html = `<div class="item clearfix" id="exp-${obj.id}">
                         <div class="item__description">${obj.description}</div>
+                        ${categoryHtml}
                         <div class="right clearfix">
                             <div class="item__value">${formatNumber(obj.value, 'exp')}</div>
                             <div class="item__delete">
                                 <button class="item__delete--btn">×</button>
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
+            var categoryInput = document.querySelector(DOMstrings.inputCategory);
+            if (categoryInput) categoryInput.value = '';
         },
 
         displayBudget: function (obj) {
             var type = obj.budget >= 0 ? 'inc' : 'exp';
-            document.querySelector(DOMstrings.budgetLabel).textContent = formatNumber(obj.budget, type);
-            document.querySelector(DOMstrings.incomeLabel).textContent = formatNumber(obj.totalInc, 'inc');
-            document.querySelector(DOMstrings.expensesLabel).textContent = formatNumber(obj.totalExp, 'exp');
-            document.querySelector(DOMstrings.percentageLabel).textContent = obj.percentage > 0 ? obj.percentage + '%' : '---';
+            setText(DOMstrings.budgetLabel, formatNumber(obj.budget, type));
+            setText(DOMstrings.incomeLabel, formatNumber(obj.totalInc, 'inc'));
+            setText(DOMstrings.expensesLabel, formatNumber(obj.totalExp, 'exp'));
+            setText(DOMstrings.percentageLabel, obj.percentage > 0 ? obj.percentage + '%' : '---');
         },
 
         displayMonth: function () {
             var now = new Date();
             var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
-            document.querySelector(DOMstrings.dateLabel).textContent = months[now.getMonth()] + ' ' + now.getFullYear();
+            var monthText = months[now.getMonth()] + ' ' + now.getFullYear();
+            setText(DOMstrings.dateLabel, monthText);
+            setText(DOMstrings.summaryMonth, monthText);
+        },
+
+        displaySummary: function (obj) {
+            var type = obj.budget >= 0 ? 'inc' : 'exp';
+            setText(DOMstrings.summaryIncome, formatNumber(obj.totalInc, 'inc'));
+            setText(DOMstrings.summaryExpenses, formatNumber(obj.totalExp, 'exp'));
+            setText(DOMstrings.summaryBalance, formatNumber(obj.budget, type));
+        },
+
+        displayPieChart: function (obj) {
+            var chart = document.querySelector(DOMstrings.pieChart);
+            if (!chart) return;
+            var total = obj.totalInc > 0 ? obj.totalInc : 0;
+            var expensePercent = total > 0 ? Math.min(Math.round((obj.totalExp / total) * 100), 100) : 0;
+            var incomePercent = 100 - expensePercent;
+            chart.style.background = `conic-gradient(#1b641b 0 ${incomePercent}%, #A52A2A ${incomePercent}% 100%)`;
+            setText(DOMstrings.pieIncome, `Income ${incomePercent}%`);
+            setText(DOMstrings.pieExpense, `Expenses ${expensePercent}%`);
+        },
+
+        displayCategoryLimits: function (summary) {
+            var list = document.querySelector(DOMstrings.categoryList);
+            if (!list) return;
+            var limits = summary.limits || {};
+            var totals = summary.totals || {};
+            var categories = Object.keys(limits);
+            list.innerHTML = '';
+            if (categories.length === 0) {
+                list.innerHTML = '<p class="empty">No category limits set yet.</p>';
+            }
+            var warnings = [];
+            categories.forEach(function (category) {
+                var limit = limits[category];
+                var spent = totals[category] || 0;
+                var percent = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 999) : 0;
+                var statusClass = spent > limit ? 'limit-card--alert' : '';
+                if (spent > limit) {
+                    warnings.push(`${category} has exceeded its limit.`);
+                }
+                list.insertAdjacentHTML('beforeend',
+                    `<div class="limit-card ${statusClass}">
+                        <div class="limit-card__title">${category}</div>
+                        <div class="limit-card__details">Spent ${formatNumber(spent, 'exp')} of ${formatNumber(limit, 'exp')}</div>
+                        <div class="limit-card__progress">
+                            <div class="limit-card__bar" style="width: ${Math.min(percent, 100)}%"></div>
+                        </div>
+                        <div class="limit-card__percent">${percent}% used</div>
+                    </div>`);
+            });
+            var warningBox = document.querySelector(DOMstrings.categoryWarning);
+            if (warningBox) {
+                warningBox.textContent = warnings.length > 0 ? `Warning: ${warnings.join(' ')}` : '';
+            }
+        },
+
+        displayRiskLevel: function (obj) {
+            var level = document.querySelector(DOMstrings.riskLevel);
+            var details = document.querySelector(DOMstrings.riskDetails);
+            if (!level || !details) return;
+            if (obj.totalInc <= 0) {
+                level.textContent = 'Low';
+                level.className = 'risk__level risk__level--low';
+                details.textContent = 'Add income to calculate risk.';
+                return;
+            }
+            var ratio = Math.round((obj.totalExp / obj.totalInc) * 100);
+            if (ratio >= 70) {
+                level.textContent = 'High';
+                level.className = 'risk__level risk__level--high';
+            } else if (ratio >= 40) {
+                level.textContent = 'Medium';
+                level.className = 'risk__level risk__level--medium';
+            } else {
+                level.textContent = 'Low';
+                level.className = 'risk__level risk__level--low';
+            }
+            details.textContent = `Expenses are ${ratio}% of income.`;
+        },
+
+        displaySavings: function (goals) {
+            var list = document.querySelector(DOMstrings.savingsList);
+            var select = document.querySelector(DOMstrings.savingsSelect);
+            if (!list || !select) return;
+            list.innerHTML = '';
+            select.innerHTML = '';
+            if (!goals || goals.length === 0) {
+                list.innerHTML = '<p class="empty">No savings goals yet.</p>';
+                select.innerHTML = '<option value="">No goals available</option>';
+                return;
+            }
+            goals.forEach(function (goal) {
+                var percent = goal.target > 0 ? Math.min(Math.round((goal.saved / goal.target) * 100), 100) : 0;
+                list.insertAdjacentHTML('beforeend',
+                    `<div class="savings-card">
+                        <div class="savings-card__title">${goal.name}</div>
+                        <div class="savings-card__details">${formatNumber(goal.saved, 'inc')} saved of ${formatNumber(goal.target, 'inc')}</div>
+                        <div class="savings-card__progress">
+                            <div class="savings-card__bar" style="width: ${percent}%"></div>
+                        </div>
+                        <div class="savings-card__percent">${percent}% completed</div>
+                    </div>`);
+                select.insertAdjacentHTML('beforeend', `<option value="${goal.id}">${goal.name}</option>`);
+            });
         },
 
         getDOMstrings: function () { return DOMstrings; }
     };
 
 })();
 
 // ======================
 // GLOBAL CONTROLLER
 // ======================
 var controller = (function (budgetCtrl, UICtrl) {
 
     var DOM = UICtrl.getDOMstrings();
 
     var setupEventListeners = function () {
         document.querySelector(DOM.inputBtn).addEventListener('click', ctrlAddItem);
         document.addEventListener('keypress', function(e) { if (e.key === 'Enter') ctrlAddItem(); });
         document.querySelector(DOM.container).addEventListener('click', ctrlDeleteItem);
-        document.querySelector(DOM.resetBtn).addEventListener('click', function () {
-            if (confirm('Reset all data?')) {
-                budgetCtrl.reset();
-                document.querySelector(DOM.incomeContainer).innerHTML = '';
-                document.querySelector(DOM.expensesContainer).innerHTML = '';
-                updateBudget();
-            }
-        });
-        document.querySelector(DOM.downloadBtn).addEventListener('click', downloadCSV);
+
+        var resetBtn = document.querySelector(DOM.resetBtn);
+        if (resetBtn) {
+            resetBtn.addEventListener('click', function () {
+                if (confirm('Reset all data?')) {
+                    budgetCtrl.reset();
+                    document.querySelector(DOM.incomeContainer).innerHTML = '';
+                    document.querySelector(DOM.expensesContainer).innerHTML = '';
+                    updateBudget();
+                    updateAdvancedPanels();
+                }
+            });
+        }
+
+        var downloadBtn = document.querySelector(DOM.downloadBtn);
+        if (downloadBtn) downloadBtn.addEventListener('click', downloadCSV);
+
+        var categoryBtn = document.querySelector(DOM.categoryBtn);
+        if (categoryBtn) categoryBtn.addEventListener('click', ctrlSetCategoryLimit);
+
+        var savingsAddBtn = document.querySelector(DOM.savingsAddBtn);
+        if (savingsAddBtn) savingsAddBtn.addEventListener('click', ctrlAddSavingsGoal);
+
+        var savingsContributeBtn = document.querySelector(DOM.savingsContributeBtn);
+        if (savingsContributeBtn) savingsContributeBtn.addEventListener('click', ctrlAddSavingsContribution);
     };
 
     var updateBudget = function () {
         budgetCtrl.calculateBudget();
-        UICtrl.displayBudget(budgetCtrl.getBudget());
+        var budget = budgetCtrl.getBudget();
+        UICtrl.displayBudget(budget);
+        UICtrl.displaySummary(budget);
+        UICtrl.displayPieChart(budget);
+    };
+
+    var updateAdvancedPanels = function () {
+        UICtrl.displayCategoryLimits(budgetCtrl.getCategorySummary());
+        UICtrl.displayRiskLevel(budgetCtrl.getBudget());
+        UICtrl.displaySavings(budgetCtrl.getSavings());
     };
 
     var ctrlAddItem = function () {
         var input = UICtrl.getInput();
         if (input.description !== "" && !isNaN(input.value) && input.value > 0) {
-            var newItem = budgetCtrl.addItem(input.type, input.description, input.value);
+            var newItem = budgetCtrl.addItem(input.type, input.description, input.value, input.category);
             UICtrl.addListItem(newItem, input.type);
             UICtrl.clearFields();
             updateBudget();
+            updateAdvancedPanels();
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
+                updateAdvancedPanels();
             }
         }
     };
 
+    var ctrlSetCategoryLimit = function () {
+        var category = document.querySelector(DOM.categoryName)?.value.trim();
+        var limit = parseFloat(document.querySelector(DOM.categoryLimit)?.value);
+        if (!category || isNaN(limit) || limit <= 0) return;
+        budgetCtrl.setCategoryLimit(category, limit);
+        document.querySelector(DOM.categoryName).value = '';
+        document.querySelector(DOM.categoryLimit).value = '';
+        updateAdvancedPanels();
+    };
+
+    var ctrlAddSavingsGoal = function () {
+        var name = document.querySelector(DOM.savingsName)?.value.trim();
+        var target = parseFloat(document.querySelector(DOM.savingsTarget)?.value);
+        if (!name || isNaN(target) || target <= 0) return;
+        budgetCtrl.addSavingsGoal(name, target);
+        document.querySelector(DOM.savingsName).value = '';
+        document.querySelector(DOM.savingsTarget).value = '';
+        updateAdvancedPanels();
+    };
+
+    var ctrlAddSavingsContribution = function () {
+        var select = document.querySelector(DOM.savingsSelect);
+        var amount = parseFloat(document.querySelector(DOM.savingsAmount)?.value);
+        if (!select || !select.value || isNaN(amount) || amount <= 0) return;
+        budgetCtrl.addSavingsContribution(parseInt(select.value), amount);
+        document.querySelector(DOM.savingsAmount).value = '';
+        updateAdvancedPanels();
+    };
+
     var downloadCSV = function () {
         var data = budgetCtrl.getData();
-        var csvContent = 'Type,Description,Value\n';
-        data.allItems.inc.forEach(function(item){ csvContent += `Income,${item.description},${item.value}\n`; });
-        data.allItems.exp.forEach(function(item){ csvContent += `Expense,${item.description},${item.value}\n`; });
+        var csvContent = 'Type,Description,Category,Value\n';
+        data.allItems.inc.forEach(function(item){ csvContent += `Income,${item.description},,${item.value}\n`; });
+        data.allItems.exp.forEach(function(item){ csvContent += `Expense,${item.description},${item.category || ''},${item.value}\n`; });
         var blob = new Blob([csvContent], {type: 'text/csv'});
         var url = URL.createObjectURL(blob);
         var a = document.createElement('a');
         a.href = url;
         a.download = 'budget_data.csv';
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
     };
 
     return {
         init: function () {
             UICtrl.displayMonth();
             budgetCtrl.load();
             var data = budgetCtrl.getData();
             data.allItems.inc.forEach(function(item){ UICtrl.addListItem(item, 'inc'); });
             data.allItems.exp.forEach(function(item){ UICtrl.addListItem(item, 'exp'); });
             updateBudget();
+            updateAdvancedPanels();
             setupEventListeners();
         }
     };
 
 })(budgetController, UIController);
 
 controller.init();
