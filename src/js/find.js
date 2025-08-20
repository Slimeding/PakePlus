document.addEventListener('DOMContentLoaded', function () {
    // 获取DOM元素
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const clearButton = document.getElementById('clear-button');
    const numberMatchCheckbox = document.getElementById('number-match');
    const clauseMatchCheckbox = document.getElementById('clause-match');
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');
    const resultsInfo = document.getElementById('results-info');
    const currentMatchSpan = document.getElementById('current-match');
    const totalMatchesSpan = document.getElementById('total-matches');
    const noResultsMessage = document.getElementById('no-results-message');

    // 存储匹配项的状态
    let matches = [];
    let currentMatchIndex = -1;

    // 中文数字映射
    const chineseNumbers = {
        '0': '零',
        '1': '一',
        '2': '二',
        '3': '三',
        '4': '四',
        '5': '五',
        '6': '六',
        '7': '七',
        '8': '八',
        '9': '九',
        '10': '十',
        '100': '百',
        '1000': '千',
        '10000': '万'
    };

    // 搜索和添加高亮
    function searchAndHighlight() {
        // 清除之前的高亮
        removeHighlights();

        // 隐藏无结果提示
        noResultsMessage.style.display = 'none';

        const searchTerm = searchInput.value.trim();

        if (!searchTerm) {
            resultsInfo.style.display = 'none';
            prevButton.disabled = true;
            nextButton.disabled = true;
            return;
        }

        // 准备正则表达式选项
        const numberMatch = numberMatchCheckbox.checked;
        const clauseMatch = clauseMatchCheckbox.checked;

        let patterns = [searchTerm];

        // 如果启用智能数字匹配且搜索词是数字
        if (numberMatch && /^\d+$/.test(searchTerm)) {
            const numberPatterns = generateNumberPatterns(searchTerm, false);
            patterns = patterns.concat(numberPatterns);
        }

        // 如果启用条数匹配且搜索词是数字
        if (clauseMatch && /^\d+$/.test(searchTerm)) {
            const clausePatterns = generateNumberPatterns(searchTerm, true);
            patterns = patterns.concat(clausePatterns);
        }

        // 转义正则表达式中的特殊字符
        const escapedPatterns = patterns.map(p =>
            p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        );

        // 创建正则表达式
        const regex = new RegExp(escapedPatterns.join('|'), 'g');

        let matchCount = 0;
        matches = [];

        // 遍历所有文本节点
        const textNodes = findTextNodes(document.body);

        textNodes.forEach(node => {
            // 跳过搜索控件内的节点
            if (node.parentNode.closest('.search-header')) return;

            const text = node.textContent;
            const parentNode = node.parentNode;

            let match;
            let lastIndex = 0;
            let fragment = document.createDocumentFragment();
            let hasMatches = false;

            // 使用正则表达式查找所有匹配项
            while ((match = regex.exec(text)) !== null) {
                matchCount++;
                hasMatches = true;

                // 匹配前的文本
                if (match.index > lastIndex) {
                    fragment.appendChild(document.createTextNode(
                        text.substring(lastIndex, match.index)
                    ));
                }

                // 创建高亮元素
                const highlightSpan = document.createElement('span');
                highlightSpan.className = 'highlight';
                highlightSpan.textContent = match[0];

                // 保存匹配元素的额外信息
                matches.push(highlightSpan);

                fragment.appendChild(highlightSpan);
                lastIndex = regex.lastIndex;

                // 如果正则表达式是全局的，需要重置lastIndex以避免无限循环
                if (!regex.global) break;
            }

            // 添加剩余文本
            if (lastIndex < text.length) {
                fragment.appendChild(document.createTextNode(
                    text.substring(lastIndex)
                ));
            }

            // 替换原始节点
            if (hasMatches) {
                parentNode.replaceChild(fragment, node);
            }
        });

        // 更新结果信息
        if (matchCount > 0) {
            resultsInfo.style.display = 'flex';
            totalMatchesSpan.textContent = matchCount;

            // 默认选中第一个匹配项
            currentMatchIndex = 0;
            highlightCurrentMatch();

            // 激活导航按钮
            prevButton.disabled = false;
            nextButton.disabled = false;
        } else {
            resultsInfo.style.display = 'none';
            prevButton.disabled = true;
            nextButton.disabled = true;

            // 显示无结果提示
            noResultsMessage.style.display = 'block';
        }
    }

    // 生成数字匹配模式
    function generateNumberPatterns(number, isClause) {
        const patterns = [];

        // 添加中文数字表示
        const chineseNum = convertToChineseNumber(number);
        if (chineseNum) {
            if (isClause) {
                // 条数匹配模式
                patterns.push('第' + chineseNum + '条');
                patterns.push('第' + chineseNum);
            } else {
                // 智能数字匹配模式
                patterns.push(chineseNum);
            }
        }

        return patterns;
    }



    function convertToChineseNumber(numStr) {
    const num = parseInt(numStr);
    if (isNaN(num)) return '';

    // 处理0-10
    if (num <= 10) {
        return chineseNumbers[num.toString()] || numStr;
    }

    // 处理11-19
    if (num < 20) {
        return '十' + (num % 10 === 0 ? '' : chineseNumbers[(num % 10).toString()]);
    }

    // 处理20-99
    if (num < 100) {
        const tens = Math.floor(num / 10);
        const units = num % 10;
        return chineseNumbers[tens.toString()] + '十' + (units === 0 ? '' : chineseNumbers[units.toString()]);
    }

    // 处理100-999（修复重点）
    if (num < 1000) {
        const hundreds = Math.floor(num / 100);
        const remainder = num % 100;
        let result = chineseNumbers[hundreds.toString()] + '百';
        
        if (remainder > 0) {
            // 特殊处理10-19区间
            if (remainder >= 10 && remainder < 20) {
                const unitsDigit = remainder % 10;
                result += '一十' + (unitsDigit > 0 ? chineseNumbers[unitsDigit.toString()] : '');
            } 
            else if (remainder < 10) {
                result += '零' + chineseNumbers[remainder.toString()];
            } 
            else {
                result += convertToChineseNumber(remainder.toString());
            }
        }
        return result;
    }

    // 其他大数处理保持不变...



        // 处理1000-9999
        if (num < 10000) {
            const thousands = Math.floor(num / 1000);
            const remainder = num % 1000;

            let result = chineseNumbers[thousands.toString()] + '千';

            if (remainder > 0) {
                if (remainder < 100) {
                    result += '零' + convertToChineseNumber(remainder.toString());
                } else {
                    result += convertToChineseNumber(remainder.toString());
                }
            }

            return result;
        }

        // 处理10000-99999
        if (num < 100000) {
            const tenThousands = Math.floor(num / 10000);
            const remainder = num % 10000;

            let result = convertToChineseNumber(tenThousands.toString()) + '万';

            if (remainder > 0) {
                if (remainder < 1000) {
                    result += '零' + convertToChineseNumber(remainder.toString());
                } else {
                    result += convertToChineseNumber(remainder.toString());
                }
            }

            return result;
        }

        // 超过99999，返回原始数字
        return numStr;
    }

    // 查找所有文本节点
    function findTextNodes(element) {
        const nodes = [];
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function (node) {
                    // 跳过脚本和样式元素
                    if (node.parentNode.nodeName === 'SCRIPT' ||
                        node.parentNode.nodeName === 'STYLE') {
                        return NodeFilter.FILTER_REJECT;
                    }

                    // 只接受非空文本节点
                    return node.textContent.trim() ?
                        NodeFilter.FILTER_ACCEPT :
                        NodeFilter.FILTER_REJECT;
                }
            },
            false
        );

        while (walker.nextNode()) {
            nodes.push(walker.currentNode);
        }

        return nodes;
    }

    // 清除所有高亮显示并返回顶部
    function removeHighlights() {
        document.querySelectorAll('.highlight').forEach(el => {
            const parent = el.parentNode;
            const textNode = document.createTextNode(el.textContent);
            parent.replaceChild(textNode, el);
            // 合并相邻的文本节点
            if (parent.normalize) parent.normalize();
        });

        matches = [];
        currentMatchIndex = -1;
        resultsInfo.style.display = 'none';
        noResultsMessage.style.display = 'none';

        // 返回页面顶部
        window.scrollTo({
            top: 0,
            behavior: 'auto' // 立即跳转
        });
    }

    // 高亮当前匹配项并滚动到位置
    function highlightCurrentMatch() {
        matches.forEach((match, index) => {
            if (index === currentMatchIndex) {
                match.classList.add('active');
                // 滚动到可见区域 - 使用快速跳转
                scrollToMatch(match);
            } else {
                match.classList.remove('active');
            }
        });

        // 更新结果计数器
        currentMatchSpan.textContent = currentMatchIndex + 1;
        totalMatchesSpan.textContent = matches.length;
    }

    // 快速滚动到匹配项
    function scrollToMatch(element) {
        // 获取元素位置
        const elementRect = element.getBoundingClientRect();
        const absoluteElementTop = elementRect.top + window.pageYOffset;

        // 计算目标位置（视口中央）
        const targetPosition = absoluteElementTop - (window.innerHeight / 2);

        // 快速滚动到元素位置
        window.scrollTo({
            top: targetPosition,
            behavior: 'auto' // 立即跳转
        });
    }

    // 导航到上一个匹配项（支持循环）
    function goToPrevMatch() {
        if (matches.length === 0) return;

        if (currentMatchIndex <= 0) {
            // 如果是第一个，循环到最后一个
            currentMatchIndex = matches.length - 1;
        } else {
            currentMatchIndex--;
        }

        highlightCurrentMatch();
    }

    // 导航到下一个匹配项（支持循环）
    function goToNextMatch() {
        if (matches.length === 0) return;

        if (currentMatchIndex >= matches.length - 1) {
            // 如果是最后一个，循环到第一个
            currentMatchIndex = 0;
        } else {
            currentMatchIndex++;
        }

        highlightCurrentMatch();
    }

    // 事件监听器
    searchButton.addEventListener('click', searchAndHighlight);

    searchInput.addEventListener('keyup', function (event) {
        if (event.key === 'Enter') {
            searchAndHighlight();
        } else if (event.key === 'Escape') {
            searchInput.value = '';
            removeHighlights();
            searchInput.focus();
        }
    });

    clearButton.addEventListener('click', removeHighlights);
    prevButton.addEventListener('click', goToPrevMatch);
    nextButton.addEventListener('click', goToNextMatch);

    // 支持键盘箭头导航
    searchInput.addEventListener('keydown', function (event) {
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            goToPrevMatch();
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            goToNextMatch();
        }
    });

    // 实时搜索选项变化
    numberMatchCheckbox.addEventListener('change', function () {
        if (searchInput.value.trim()) {
            searchAndHighlight();
        }
    });

    clauseMatchCheckbox.addEventListener('change', function () {
        if (searchInput.value.trim()) {
            searchAndHighlight();
        }
    });

    // 初始示例搜索
    searchInput.value = '';
    searchAndHighlight();
});