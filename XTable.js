;
(function (undefined) {
    "use strict"
    var _global;

    // 工具函数

    /**
     * 判断某个对象是否为数组
     * 
     * @param {*} o 对象
     */
    function isArray(o) {
        if (o === 'undefined' || o === null) return false;
        if (typeof Array.isArray === 'undefined') {
            return Object.prototype.toString.call(o) === '[object Array]';
        } else {
            return Array.isArray(o);
        }
    }

    /**
     * 两个对象进行合并
     * @param {*} o 目标
     * @param {*} n 源
     * @param {*} override 是否覆盖属性
     */
    function extend(o, n, override) {
        n = JSON.parse(JSON.stringify(n));
        for (var key in n) {
            if (n.hasOwnProperty(key) && (!o.hasOwnProperty(key) || override)) {
                o[key] = n[key];
            }
        }
        return o;
    }

    /**
     * 格式化千位符
     * 
     * @param {*} num 
     */
    function toThousands(num) {
        var num = (num).toString(),
            result = '';
        var point = num.indexOf(".") == -1 ? "" : num.substring(num.indexOf("."));
        num = num.indexOf(".") == -1 ? num : num.substring(0, num.indexOf("."));
        while (num.length > 3) {
            result = ',' + num.slice(-3) + result;
            num = num.slice(0, num.length - 3);
        }
        if (num) {
            result = num + result + point;
        }
        return result;
    }

    /**
     * 对传入的表头项目进行处理
     * 
     * @param {*} options
     */
    function clacHeader(options) {
        var maxDepth = 0;
        var summaryFields = [];
        var fields = [];
        var fieldsConfig = [];
        /**
         * 计算colspan
         * 
         * @param childItemList 后端返回的项目数组（树）
         * @param depth 当前层级，从0开始
         * @return 增加colspan属性后的项目数组（树）
         **/
        var clacColspan = function (childItems, depth) {
            var items = [];
            for (var index in childItems) {
                var item = childItems[index];
                item.depth = depth;

                if (maxDepth < item.depth) {
                    maxDepth = item.depth;
                }
                item.colspan = 0;
                if (item.children && item.children.length > 0) {
                    var childrens = clacColspan(item.children, depth + 1);
                    childrens.forEach(function (o) {
                        item.colspan += o.colspan;
                    });
                    item.children = childrens;
                } else if (!item.hidden) {
                    // 非隐藏项目
                    item.colspan = 1;
                    fieldsConfig.push(item);
                    // 获取数据显示列表
                    fields.push(item.field);
                    // 获取合计项目列表
                    item.summary ? summaryFields.push(item.field) : summaryFields.push("");
                } else {
                    item.colspan = 0;
                }
                items.push(item);
            }
            return items;
        };

        /**
         * 计算rowspan，同时把colspan=0的处理为1
         * 
         * @param childItemList 后端返回的项目数组（树）
         * @param depth 头部最大层级d
         * @return 增加rowspan属性后的项目数组（树）
         **/
        var calcRowspan = function (childItems, maxDepth) {
            var items = [];
            for (var index in childItems) {
                var item = childItems[index];
                item.colspan = item.colspan.toString();
                if (item.children && item.children.length > 0) {
                    item.rowspan = "1";
                    var childrens = calcRowspan(item.children, maxDepth);
                    item.children = childrens;
                } else if (item.depth < maxDepth - 1) {
                    // 不是最大层节点
                    item.rowspan = (maxDepth - item.depth).toString();
                } else {
                    // 最大层叶子节点
                    item.rowspan = (maxDepth - item.depth).toString();
                }
                items.push(item);
            }
            return items;
        };

        // 生成表头项目树
        var headerTree = clacColspan(options.colnums, 0);
        headerTree = calcRowspan(headerTree, maxDepth + 1);

        return {
            xHeader: headerTree,
            xMaxFloor: maxDepth,
            xSummaryFields: summaryFields,
            // 生成数据项列表
            xFields: fields,
            xFieldsConfig: fieldsConfig
        };
    };

    /**
     * 渲染表格
     * 
     */
    function render(container, options) {

        var xConfig = clacHeader(options);

        /**
         * 生成colgroup
         */
        var renderColgroup = function () {
            // 生成colgroup
            var colgroup = [];
            colgroup.push("<colgroup>");
            colgroup.push("<col style=\"width: 45px; min-width: 45px; height: 25px; \">");
            for (var i = 0; i < xConfig.xFields.length; i++) {
                var width = !xConfig.xFieldsConfig[i].width ? options.defVal.width : xConfig.xFieldsConfig[i].width;
                colgroup.push("<col style=\"width: ")
                colgroup.push(width);
                colgroup.push("px; min-width: ")
                colgroup.push(width);
                colgroup.push("px; height: ");
                colgroup.push(options.defVal.height)
                colgroup.push("px; \">");
            }
            colgroup.push("</colgroup>");

            return colgroup.join("");
        }
        /**
         * 生成表体的html内容
         * 
         * @param {*} data 
         */
        var renderTbody = function (data) {
            // 无传递数据则使用默认数据
            data = !data ? options.data : data;
            if (!data || data.length < 1) {
                return "<tbody><tr><td class=\"font-center\" colspan=\"" +
                    (xConfig.xFields.length + 1) + "\">无数据</td></tr></tbody>";
            }

            // 计算合计项目
            var summaryItem = [];
            var html = "";
            for (var j = 0; j < data.length; j++) {
                var tr = "<td title=\"点击选择此行\" class=\"font-center\"><div class=\"xtable-cell\">".concat(j + 1).concat("</div></td>");
                for (var i = 0; i < xConfig.xFields.length; i++) {
                    var tdValue = !data[j][xConfig.xFields[i]] ? "" : data[j][xConfig.xFields[i]];
                    if (!isNaN(tdValue)) {
                        tdValue = toThousands(tdValue);
                    }
                    tr = tr.concat("<td data-x=\"").concat(j).concat("\" data-y=\"").concat(i).concat("\"><div class=\"xtable-cell\">")
                        .concat(tdValue).concat("</div></td>");
                    if (options.summary) {
                        // 计算项目合计
                        if (!!xConfig.xSummaryFields[i]) {
                            !!summaryItem[i] ? summaryItem[i] = (Number(summaryItem[i]) + Number(data[j][xConfig.xFields[i]])) :
                                summaryItem[i] = (Number(data[j][xConfig.xFields[i]]));
                        } else {
                            summaryItem[i] = "";
                        }
                    }
                }
                tr = "<tr>".concat(tr).concat("</tr>");
                html = html.concat(tr);
            }
            html = "<tbody>".concat(html).concat("</tbody>");
            if (options.summary) {
                // 生成合计行
                var summaryHtml = "<tfoot><tr> <td>合计</td>";
                for (var i = 0; i < summaryItem.length; i++) {
                    summaryHtml = summaryHtml.concat("<td class=\"font-right\"><div class=\"xtable-cell\">").concat(toThousands(summaryItem[i])).concat("</div></td>");
                }
                summaryHtml = summaryHtml.concat("</tr></tfoot>");
                html = html.concat(summaryHtml);
            }

            return html;
        }

        /**
         * 生成表头的html内容
         * 
         * @param {*} headers 
         */
        var renderThead = function () {
            var depth = 0;
            var headers = xConfig.xHeader;
            if (!headers || headers.length == 0) {
                return "";
            }
            var seqHtml = "<th class=\"font-center\" colspan=\"1\" rowspan=\"".concat(xConfig.xMaxFloor + 1).concat("\">序号</th>");
            var buildTheadHtml = function (headers, depth) {
                var html = "";
                var childHtml = "";
                for (var rowIndex = 0; rowIndex < headers.length; rowIndex++) {
                    var item = headers[rowIndex];
                    if (!item.hidden) {
                        var classHml = "class=\"".concat(!item.textAlign ? "font-center" : item.textAlign).concat("\"");
                        html = html.concat("<th colspan=\"").concat(item.colspan).concat("\" rowspan=\"")
                            .concat(item.rowspan).concat("\" ").concat(classHml).concat(">").concat(item.title).concat("</th>");
                    }
                    if (item.children && item.children.length > 0) {
                        childHtml = childHtml.concat(buildTheadHtml(item.children, depth + 1));
                    }
                }
                html = depth == 0 ? seqHtml.concat(html) : html;
                html = childHtml.length > 0 ? "<tr>".concat(html).concat("</tr>") : html;
                childHtml = childHtml.length > 0 && childHtml.indexOf("<tr>") == -1 ? "<tr>".concat(childHtml).concat("</tr>") : childHtml;
                html = html.concat(childHtml);
                html = depth == 0 ? "<thead>".concat(html).concat("</thead>") : html;
                return html;
            };

            return buildTheadHtml(headers, depth);
        };

        /**
         * 容器内容生成
         */
        var htmlTemplate = function () {
            var html = [];
            html.push("<div class=\"xtable-container\">");
            html.push("    <div class=\"xtable-wraper\">");
            html.push("        <div class=\"xtable-wraper-main\">");
            html.push("            <div class=\"xtable-left\">");
            html.push("                <div class=\"xtable-left-header\">");
            html.push("                    <table>");
            html.push("                        {xlhead}");
            html.push("                    </table>");
            html.push("                </div>");
            html.push("                <div class=\"xtable-left-body\">");
            html.push("                    <table>");
            html.push("                        {xlbody}");
            html.push("                    </table>");
            html.push("                </div>");
            html.push("            </div>");
            html.push("            <div class=\"xtable-head\">");
            html.push("                <table>");
            html.push("                    {xhead}");
            html.push("                </table>");
            html.push("            </div>");
            html.push("            <div class=\"xtable-body\">");
            html.push("                <table>");
            html.push("                    {xbody}");
            html.push("                </table>");
            html.push("            </div>");
            html.push("        </div>");
            html.push("    </div>");
            html.push("</div>");
            return html.join("");
        };

        // 生成表格html标签内容
        var thead_html = renderThead();
        var tbody_html = renderTbody();
        var colgroup_html = renderColgroup();
        var table_html = options.fixedheader ? colgroup_html.concat(tbody_html) : colgroup_html.concat(thead_html).concat(tbody_html);
        var htmlTpl = htmlTemplate();
        htmlTpl = htmlTpl.replace("{xhead}", options.fixedheader ? colgroup_html.concat(thead_html) : "");
        htmlTpl = htmlTpl.replace("{xbody}", table_html);
        htmlTpl = htmlTpl.replace("{xlhead}", options.fixedcolnums ? colgroup_html.concat(thead_html) : "");
        htmlTpl = htmlTpl.replace("{xlbody}", options.fixedcolnums ? colgroup_html.concat(tbody_html) : "");
        // 渲染到容器内
        container.innerHTML = htmlTpl;
        // 滚动条容器的父容器
        var wraper = container.getElementsByClassName("xtable-wraper")[0];
        // 滚动条容器
        var wraperMain = container.getElementsByClassName("xtable-wraper-main")[0];
        // 表头部
        var xhead = container.getElementsByClassName("xtable-head")[0];
        var headTable = xhead.getElementsByTagName("table")[0];
        // 表体
        var xbody = container.getElementsByClassName("xtable-body")[0];
        // 左侧浮动
        var fixedLeftEl = container.getElementsByClassName("xtable-left")[0];
        // 左侧浮动表格体对象
        var leftBody = fixedLeftEl.getElementsByClassName("xtable-left-body")[0];
        var leftBodyTable = leftBody.getElementsByTagName("table")[0];

        resize();

        function resize() {

            // 设置表体的顶部距离
            xbody.style.marginTop = (xhead.offsetHeight + "").concat("px");
            // 取得头部left值
            var headerL = wraper.offsetLeft + 1;
            // 表格体容器的高度
            var parentElSH = xbody.clientHeight;
            // 设置左侧浮动窗口大小 = 表体容器的高度 + 表头的高度
            fixedLeftEl.style.height = (parentElSH + xhead.clientHeight + 1) + "px";
            // 设置左侧浮动窗口的top = 表头的高度
            var leftTop = leftBody.style.top = (xhead.clientHeight + 0) + "px";
            if (!!options.fixedheader) {
                // 设置头的宽度
                xhead.style.width = xbody.clientWidth + "px";
            } else {
                // 隐藏浮动的头
                xhead.style.display = "none";
            }

            if (!!options.fixedcolnums) {
                // 设置左侧的宽度
                var ths = xhead.getElementsByTagName("tr")[0].getElementsByTagName("th");
                var leftW = Number(options.fixedcolnums);
                for (var i = 0; i < options.fixedcolnums; i++) {
                    leftW = leftW + ths[i].clientWidth;
                }
                fixedLeftEl.style.width = leftW + "px";
            } else {
                // 隐藏左侧浮动
                fixedLeftEl.style.display = "none";
            }
        }
        var trs = xbody.getElementsByTagName("tbody")[0].getElementsByTagName("tr");
        var ltrs = !!options.fixedcolnums ? leftBody.getElementsByTagName("tbody")[0].getElementsByTagName("tr") : null;
        /** 事件开始 */
        /**
         * 序号列单击事件
         * 
         * @param {*} event 
         * @param {*} obj 
         */
        var seqClickTd = function (event) {
            var row = event.target.parentNode.parentNode.rowIndex;
            var css = trs[row].className;
            if (css.indexOf("selected") >= 0) {
                css = css.replace(" selected", "");
            } else {
                css = css.concat(" selected");
            }
            trs[row].className = css;
            if (!!ltrs) {
                ltrs[row].className = css;
            }
        };

        /**
         * 单元格双击事件
         * 
         * @param {*} event 
         * @param {*} obj 
         */
        var onClickTd = function (event) {
            if (event.target.tagName != "DIV") return;
            var oldVal = event.target.innerHTML;
            oldVal = oldVal.replace(/,/g, "");
            var input = "<input type='text' id='tempTxt' value='" + oldVal + "' >";
            event.target.innerHTML = input;
            event.target.firstChild.focus();
            event.target.firstChild.onblur = function () {
                this.value = this.value == "" ? "0.00" : this.value
                event.target.innerHTML = toThousands(this.value);
                var row = event.target.parentNode.getAttribute("data-x");
                var col = event.target.parentNode.getAttribute("data-y");
                options.data[row][xConfig.xFields[col]] = this.value;
            };
        };

        function onMouseOverTr(event) {
            if (event.target.tagName != "DIV") return;
            var row = event.currentTarget.rowIndex;
            if (!!bodyTrs[row].className) {
                if (bodyTrs[row].className.indexOf(" hover") == -1) {
                    bodyTrs[row].className = bodyTrs[row].className + " hover";
                }
            } else {
                bodyTrs[row].className = " hover";
            }
            if (leftBodyTrs.length > 0) {
                leftBodyTrs[row].className = bodyTrs[row].className;
            }
        };

        function onMouseOutTr(event) {
            if (event.srcElement.tagName != "DIV") return;
            var row = event.currentTarget.rowIndex;
            if (!!bodyTrs[row].className) {
                if (bodyTrs[row].className.indexOf(" hover") >= 0) {
                    bodyTrs[row].className = bodyTrs[row].className.replace(" hover", "");
                }
            }
            if (leftBodyTrs.length > 0) {
                leftBodyTrs[row].className = bodyTrs[row].className;
            }
        };

        function handleScroll() {
            if (!!options.fixedcolnums) {
                // 竖向滚动条滚动
                leftBodyTable.style.marginTop = "-".concat(wraperMain.scrollTop).concat("px");
            }
            // 横向滚动条滚动
            headTable.style.marginLeft = "-".concat(wraperMain.scrollLeft).concat("px");
            // 向右滚动时增加阴影效果
            if (Math.floor(wraperMain.scrollLeft) > 0) {
                if (fixedLeftEl.className.indexOf(" xtable-shadow") == -1) {
                    fixedLeftEl.className = fixedLeftEl.className + " xtable-shadow";
                }
            } else {
                fixedLeftEl.className = fixedLeftEl.className.replace(" xtable-shadow", "");
            }
        };

        /** 事件结束 **/
        for (var i = 0; i < trs.length; i++) {
            // 绑定序号单击事件
            trs[i].firstChild.onclick = function () {
                seqClickTd(event);
            }
            if (!!options.fixedcolnums) {
                ltrs[i].firstChild.onclick = function () {
                    seqClickTd(event);
                }
            }
            // 绑定可编辑列的双击事件
            for (var j = 1; j < trs[i].childNodes.length; j++) {
                if (!xConfig.xFieldsConfig[j - 1]["readOnly"]) {
                    trs[i].childNodes[j].onclick = function () {
                        onClickTd(event);
                    }
                }
            }
        }
        // 锁定左侧
        if (!!options.fixedcolnums) {
            // 设置鼠标事件：
            var bodyTrs = xbody.getElementsByTagName("tr");
            var leftBodyTrs = leftBody.getElementsByTagName("tr");
            for (var i = 0; i < bodyTrs.length; i++) {
                bodyTrs[i].onmouseover = function (event) {
                    onMouseOverTr(event);
                };
                bodyTrs[i].onmouseout = function (event) {
                    onMouseOutTr(event);
                };
                if (leftBodyTrs.length > 0) {
                    leftBodyTrs[i].onmouseover = function (event) {
                        onMouseOverTr(event);
                    };
                    leftBodyTrs[i].onmouseout = function (event) {
                        onMouseOutTr(event);
                    };
                }
            }
        }
        // 锁定左侧或者锁定头部
        if (!!options.fixedcolnums || !!options.fixedheader) {
            // 监听滚动条事件
            wraperMain.onscroll = function () {
                handleScroll();
            };

            window.onresize = function () {
                resize();
            }
        }
    };

    /**
     * 构造函数 XTable object
     * 
     * @param {*} container
     * @param {*} options 
     */
    function XTable(container, options) {
        if (!(this instanceof XTable)) {
            return new XTable(container, options);
        }
        // 容器为空
        if (!container) {
            return;
        }
        // 配置的表头为空
        if (!options || !options.colnums) {
            return;
        }

        // 初始化
        this._initial(options);
        // 渲染
        this._render();
    }

    /**
     * 属性部分
     */
    XTable.prototype = {
        constructor: this,
        /**
         * 初始化
         * 
         * @param {*} container 
         * @param {*} opt 
         */
        _initial: function (opt) {
            // 默认参数
            var def = {
                data: [],
                colnums: [],
                readOnly: true,
                summary: false,
                fixedheader: false,
                fixedcolnums: 0,
                defVal: {
                    width: 140, // 列宽
                    height: 25 // 行高
                }
            };
            this.def = extend(def, opt, true); //配置参数
            this.container = container; //存放控件的容器
            // 初始数据备份
            this.master = JSON.parse(JSON.stringify(opt.data));
            this.listeners = []; //自定义事件，用于监听插件的用户交互
            this.handlers = {};
        },
        /**
         * 表格渲染
         * 
         * @param {*} container 
         */
        _render: function () {
            render(this.container, this.def);
        },
        /**
         * 添加事件
         * 
         * @param {*} type 事件类型
         * @param {*} handler 事件handler
         */
        on: function (type, handler) {
            // type: show, shown, hide, hidden, close, confirm
            if (typeof this.handlers[type] === 'undefined') {
                this.handlers[type] = [];
            }
            this.listeners.push(type);
            this.handlers[type].push(handler);
            return this;
        },
        /**
         * 移除事件
         * 
         * @param {*} type 事件类型
         * @param {*} handler 事件handler
         */
        off: function (type, handler) {
            if (this.handlers[type] instanceof Array) {
                var handlers = this.handlers[type];
                for (var i = 0, len = handlers.length; i < len; i++) {
                    if (handlers[i] === handler) {
                        break;
                    }
                }
                this.listeners.splice(i, 1);
                handlers.splice(i, 1);
                return this;
            }
        },
        /**
         * 提交事件
         * 
         * @param {} event 事件
         */
        emit: function (event) {
            if (!event.target) {
                event.target = this;
            }
            if (this.handlers[event.type] instanceof Array) {
                var handlers = this.handlers[event.type];
                for (var i = 0, len = handlers.length; i < len; i++) {
                    handlers[i](event);
                    return true;
                }
            }
            return false;
        },
        getAllData: function () {
            return this.options.data;
        },

        getSelectedData: function () {},

        getChangedData: function () {},

        getRowData: function () {},

        setRowData: function () {}
    }

    // Use shorcuts for functions names
    // XTable.prototype.init = XTable.prototype.render;

    // 最后将插件对象暴露给全局对象
    _global = (function () {
        return this || (0, eval)('this');
    }());
    if (typeof module !== "undefined" && module.exports) {
        module.exports = XTable;
    } else if (typeof define === "function" && define.amd) {
        define(function () {
            return XTable;
        });
    } else {
        !('XTable' in _global) && (_global.XTable = XTable);
    }
})();