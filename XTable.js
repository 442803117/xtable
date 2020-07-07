!(function () {
    'use strict';

    /**
     * Constructor function which creates a new XTable object
     * @param {*} container
     * @param {*} options 
     */
    function XTable(container, options) {
        /*
        var options = {
            data:[]
            , colnums:[]
        }
        */
        if (!(this instanceof XTable)) {
            return new XTable(container, options);
        }

        if (!container) {
            return;
        }

        if (!options || !options.colnums) {
            return;
        }

        // 容器
        this.container = container;
        // 配置项
        this.options = options = JSON.parse(JSON.stringify(options));
        // 初始数据备份
        this.master = JSON.parse(JSON.stringify(options.data));

        // 数据项
        var xFields = [];
        // 合计数据项
        var xSummaryFields = [];
        // 数据项配置
        var xFieldsConfig = [];
        // 头部的层级
        var xMaxFloor = 0;
        // 头部树
        var xHeaderTree = [];
        var defaultValue = {
            width: 140,
            height: 25
        };

        /**
         * 初始化表格控件
         * 做一些准备工作，计算表格头的colspan、rowspan以及对显示数据的字段进行筛选
         */
        var init = function (options) {
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
            xHeaderTree = calcRowspan(headerTree, maxDepth + 1);
            xMaxFloor = maxDepth;
            xSummaryFields = summaryFields;
            // 生成数据项列表
            xFields = fields;
            xFieldsConfig = fieldsConfig;
        };

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
         * 渲染表格
         * 
         */
        var render = function (options, container) {
            /**
             * 生成colgroup
             */
            var renderColgroup = function () {
                // 生成colgroup
                var colgroup = [];
                colgroup.push("<colgroup>");
                colgroup.push("<col style=\"width: 45px; min-width: 45px; height: 25px; \">");
                for (var i = 0; i < xFields.length; i++) {
                    var width = !xFieldsConfig[i].width ? defaultValue.width : xFieldsConfig[i].width;
                    colgroup.push("<col style=\"width: ")
                    colgroup.push(width);
                    colgroup.push("px; min-width: ")
                    colgroup.push(width);
                    colgroup.push("px; height: ");
                    colgroup.push(defaultValue.height)
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
                        (xFields.length + 1) + "\">无数据</td></tr></tbody>";
                }

                // 计算合计项目
                var summaryItem = [];
                var html = "";
                for (var j = 0; j < data.length; j++) {
                    var tr = "<td title=\"点击选择此行\" class=\"font-center\"><div class=\"xtable-cell\">".concat(j + 1).concat("</div></td>");
                    for (var i = 0; i < xFields.length; i++) {
                        var tdValue = !data[j][xFields[i]] ? "" : data[j][xFields[i]];
                        if (!isNaN(tdValue)) {
                            tdValue = toThousands(tdValue);
                        }
                        tr = tr.concat("<td data-x=\"").concat(j).concat("\" data-y=\"").concat(i).concat("\"><div class=\"xtable-cell\">")
                            .concat(tdValue).concat("</div></td>");
                        if (options.summary) {
                            // 计算项目合计
                            if (!!xSummaryFields[i]) {
                                !!summaryItem[i] ? summaryItem[i] = (Number(summaryItem[i]) + Number(data[j][xFields[i]])) : summaryItem[i] = (Number(data[j][xFields[i]]));
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
                var headers = xHeaderTree;
                if (!headers || headers.length == 0) {
                    return "";
                }
                var seqHtml = "<th class=\"font-center\" colspan=\"1\" rowspan=\"".concat(xMaxFloor + 1).concat("\">序号</th>");
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
            //console.log("thead_html : " + thead_html);
            var tbody_html = renderTbody();
            //console.log("tbody_html : " + thead_html);
            var colgroup_html = renderColgroup();
            var table_html = options.fixedheader ? colgroup_html.concat(tbody_html) : colgroup_html.concat(thead_html).concat(tbody_html);
            // console.log("table_html : " + table_html);
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
                    options.data[row][xFields[col]] = this.value;
                };
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
                    if (!xFieldsConfig[j - 1]["readOnly"]) {
                        trs[i].childNodes[j].onclick = function () {
                            onClickTd(event);
                        }
                    }
                }
            }
            // 锁定左侧
            if (!!options.fixedcolnums) {
                function onMouseOverOutTr(event) {
                    if (event.target.tagName == "INPUT") return;
                    var row = event.target.tagName == "TD" ? event.target.parentNode.rowIndex : event.target.parentNode.parentNode.rowIndex;
                    if (!!bodyTrs[row].className) {
                        if (bodyTrs[row].className.indexOf(" hover") >= 0) {
                            bodyTrs[row].className = bodyTrs[row].className.replace(" hover", "");
                        } else {
                            bodyTrs[row].className = bodyTrs[row].className + " hover";
                        }
                    } else {
                        bodyTrs[row].className = " hover";
                    }
                    if (leftBodyTrs.length > 0) {
                        leftBodyTrs[row].className = bodyTrs[row].className;
                    }
                };

                function onLeftMouseOverOutTr(event) {
                    if (event.target.tagName == "INPUT") return;
                    var row = event.target.tagName == "TD" ? event.target.parentNode.rowIndex : event.target.parentNode.parentNode.rowIndex;
                    if (!!leftBodyTrs[row].className) {
                        if (leftBodyTrs[row].className.indexOf(" hover") >= 0) {
                            leftBodyTrs[row].className = leftBodyTrs[row].className.replace(" hover", "");
                        } else {
                            leftBodyTrs[row].className = leftBodyTrs[row].className + " hover";
                        }
                    } else {
                        leftBodyTrs[row].className = " hover";
                    }
                    bodyTrs[row].className = leftBodyTrs[row].className;
                };

                // 设置鼠标事件：
                var bodyTrs = xbody.getElementsByTagName("tr");
                var leftBodyTrs = leftBody.getElementsByTagName("tr");
                for (var i = 0; i < bodyTrs.length; i++) {
                    bodyTrs[i].onmouseover = function (event) {
                        onMouseOverOutTr(event);
                    }
                    bodyTrs[i].onmouseout = function (event) {
                        onMouseOverOutTr(event);
                    }
                    if (leftBodyTrs.length > 0) {
                        leftBodyTrs[i].onmouseover = function (event) {
                            onLeftMouseOverOutTr(event);
                        }
                        leftBodyTrs[i].onmouseout = function (event) {
                            onLeftMouseOverOutTr(event);
                        }
                    }
                }
            }
            // 锁定左侧或者锁定头部
            if (!!options.fixedcolnums || !!options.fixedheader) {
                function handleScroll() {
                    console.log("top : " + wraperMain.scrollTop);

                    if (!!options.fixedcolnums) {
                        // 竖向滚动条滚动
                        // leftBody.scrollTop = wraperMain.scrollTop;
                        leftBodyTable.style.marginTop = "-".concat(Math.ceil(wraperMain.scrollTop)).concat("px");
                        console.log("top : " + Date.now());
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

                // 节流函数
                function throttle(func, wait, options) {
                    var context, args, result;
                    var timeout = null;
                    var previous = 0;
                    if (!options) options = {};
                    var later = function () {
                        previous = options.leading === false ? 0 : Date.now();
                        timeout = null;
                        result = func.apply(context, args);
                        if (!timeout) context = args = null;
                    };
                    return function () {
                        var now = Date.now();
                        if (!previous && options.leading === false) previous = now;
                        var remaining = wait - (now - previous);
                        context = this;
                        args = arguments;
                        if (remaining <= 0 || remaining > wait) {
                            if (timeout) {
                                clearTimeout(timeout);
                                timeout = null;
                            }
                            previous = now;
                            result = func.apply(context, args);
                            if (!timeout) context = args = null;
                        } else if (!timeout && options.trailing !== false) {
                            timeout = setTimeout(later, remaining);
                        }
                        return result;
                    };
                };
                // fixedLeftEl.onmousewheel = function () {
                //     console.log("sssssssssssss");
                // }
                // 监听滚动条事件
                wraperMain.onscroll = function () {
                    throttle(handleScroll(), 15);
                };

                window.onresize = function () {
                    resize();
                }
            }
        };


        // 初始化
        init(this.options);
        // 渲染
        render(this.options, this.container);
    }

    XTable.prototype.getAllData = function () {
        return this.options.data;
    }

    XTable.prototype.getSelectedData = function () {

    }

    XTable.prototype.getChangedData = function () {

    }

    XTable.prototype.getRowData = function () {

    }

    XTable.prototype.setRowData = function () {

    }


    // Use shorcuts for functions names
    // XTable.prototype.init = XTable.prototype.render;
    // XTable.prototype.minus = XTable.prototype.subtract;
    // XTable.prototype.div = XTable.prototype.divide;
    // XTable.prototype.mult = XTable.prototype.multiply;
    // XTable.prototype.pow = XTable.prototype.power;
    // XTable.prototype.val = XTable.prototype.toString;

    // CommonJS
    if (typeof exports === 'object' && typeof module !== 'undefined') {
        module.exports = XTable;
    } else if (typeof window !== 'undefined') {
        window.XTable = XTable;
    }
})();