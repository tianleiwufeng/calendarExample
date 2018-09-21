//增加日期的Format方法
Date.prototype.Format = function (fmt) { //author: meizz
    fmt = fmt || 'yyyy-MM-dd';
    var o = {
        "M+": this.getMonth() + 1, //月份
        "d+": this.getDate(), //日
        "h+": this.getHours(), //小时
        "m+": this.getMinutes(), //分
        "s+": this.getSeconds(), //秒
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
        "S": this.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt))
        fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt))
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}

if ($.toast) {
    $.toast.prototype.defaults.duration = 2000;
    window.alert = function (message) {
        $.toast(message, 'text');
    }
}

(function () {

    var calendarDisplay = $('#calendarDisplay'),
        calendarDisplayLeft = $('#calendarDisplayLeft'),
        courseContent = $('#courseContent'),
        calendarContainer = $('#calendarContainer'),
        courseList = $('#courseList'),
        noDataContainer = $('#noDataContainer'),
        courseTable = $('#courseTable');

    var classTableModeFlag = false; //为true代表课程表模式
    var calendar; // 日历
    var currentDate = ''; //'2010-01-01'格式
    var currentCourseList; // 当前课程对象{'2010-01-01:[{...}]'}
    var currentHeaderObj = {}; // 储存的顶部数据对象
    var unitHeight = 65;//table单小时高度
    var baseHour = '08:00';//起始时间

    // 生成科目颜色对象
    var subjectObj = {}; // 科目颜色对象
    var subjectNum = 0; // 科目数
    var subjectColorArr = ['#3E87FF', '#10B2FD', '#B66AD5', '#8003AB', '#9C41FE', '#2907B1', '#164383', '#391B96', '#D51C99', '#83C3F0'];// 颜色数组
    var storageStatus = localStorage.getItem('myCourse-prePage'); // 缓存状态
    storageStatus = storageStatus ? JSON.parse(storageStatus) : {};

    initEvent();
    initData();

    //new VConsole();
    function initEvent() {

        // 切换课表和日历显示
        calendarDisplay.on('click', 'img', function () {
            var srcHeader = './myCourseFolder/images/',
                src = 'classTable.svg';

            classTableModeFlag = !classTableModeFlag;
            courseContent.toggleClass('classTableMode');
            if (classTableModeFlag) {
                // 切换成课表模式先将日历设置成周模式
                calendar.setWeekMode();
                renderClassTable();
                src = 'calendar.svg';
            }
            this.src = srcHeader + src;
            renderDisplay();
            $(window).resize();
        })

        // 课程列表向上滑动时将课程设为周模式
        courseList.add(noDataContainer).on('scroll', function () {
            calendar.setWeekMode();
        })
    }

    //初始化列表
    function initList(preTime, nextTime) {

        var res = {
            data: {
                dtoList: [
                    {
                        className: "天雷1班",
                        courseDate: "2018-09-28",
                        courseId: "68218751s",
                        date: "9月28日（周二）",
                        gradeName: "初三",
                        hours: 1,
                        organizationName: "天河校区",
                        roomName: "大一起",
                        seat: "7",
                        seatColumn: 1,
                        seatRow: 3,
                        statusColor: "",
                        studyManagerName: "路老师",
                        subjectName: "语文",
                        teacherName: "天老师",
                        time: "10:00 ~ 11:30",
                    }
                ],
                hasCourseDateList: ["2018-09-28"]
            }
        }
        var data = res.data,
            calendarList = calendar.getCurrentCalendarList(),
            obj = {};

        data.dtoList.forEach(function (item) {
            obj[item.courseDate] = obj[item.courseDate] || [];
            obj[item.courseDate].push(item);

            // 生成subjectObj
            if (!subjectObj[item.subjectName]) {
                subjectNum++;
                subjectObj[item.subjectName] = subjectColorArr[subjectNum % 10];
            }
        })

        currentCourseList = obj;
        data.hasCourseDateList.forEach(function (item) {
            calendarList.find('span[data-date="' + item + '"]').addClass('hasCourse');
        })
        renderCourseList();
        renderClassTable();
    }

    // 渲染顶部的显示
    function renderDisplay() {
        calendarDisplayLeft.html(template('template-calendarDisplay', $.extend({}, currentHeaderObj, {
            classTableModeFlag: classTableModeFlag,
        })));
    }

    // 渲染课程列表
    function renderCourseList() {
        if (!currentDate || !currentCourseList) return;
        var todayCourseList = currentCourseList[currentDate];

        if (todayCourseList && todayCourseList.length > 0) {
            courseList.html(template('template-courseList', { items: todayCourseList }));
            courseList.show();
            noDataContainer.hide();
        } else {
            courseList.hide();
            noDataContainer.show();
        }
    }

    // 渲染课程表格
    function renderClassTable() {

        // 两个时间之间的距离
        function spaceBetween(startTime, endTime) {
            var startNum = parseInt(startTime.split(':')[0]) + (parseInt(startTime.split(':')[1]) / 60),
                endNum = parseInt(endTime.split(':')[0]) + (parseInt(endTime.split(':')[1]) / 60);

            if (endNum < startNum) return null;
            return parseFloat(((endNum - startNum) * unitHeight).toFixed(2));
        }

        if (!currentCourseList) return;
        var dateRange = calendar.getCurrentWeekRange();/**[{date:'2010-01-01',day:0,dayCn:'日'}] */
        var preDates = calendar.getCurrentWeekRange(-1);
        var nextDates = calendar.getCurrentWeekRange(1);
        // 渲染表格
        courseTable.html(template('template-courseTable', { dates: { items: dateRange }, preDates: { items: preDates }, nextDates: { items: nextDates } }));

        // 给课程表的body加上高度，为了滚动
        courseTable.find('#courseTableBodyContainer').css({
            height: document.documentElement.clientHeight - 118
        });

        // 绑定滑动事件
        var thList = courseTable.find('#courseTableThList')[0];
        bindSlide(thList, {
            touchmoveCallback: function (dirs) {
                var dirY = dirs.dirY;
                var dir = dirs.dir;

                if (Math.abs(dir) > Math.abs(dirY)) {
                    // 横向滑动
                    var nextMonthFlag = dir < 0;
                    if (nextMonthFlag) {
                        thList.style.transform = 'translate(calc(-33.33% + ' + dir + 'px), 0)'
                    } else {
                        thList.style.transform = 'translate(calc(-33.33% + ' + dir + 'px), 0)'
                    }
                }
            },
            touchendCallback: function () {
                thList.style.transform = '';
                thList.style.height = '';
            }
        });
        bindSlide(courseTable.find('#courseTimeList')[0]);

        // 遍历渲染表格内课程
        var hasDataFlag = false;
        dateRange.forEach(function (dateItem) {
            var date = dateItem.date,
                currentArr = currentCourseList[date],
                td = courseTable.find('#courseTableBody div[data-date="' + date + '"]'),
                couseArr = [];

            if (currentArr && currentArr.length > 0) {
                hasDataFlag = true;
                couseArr = currentArr.map(function (item) {
                    item.time = item.time.replace(/~/g, '-');
                    var startTime = item.time.split(/\s?-\s?/g)[0],
                        endTime = item.time.split(/\s?-\s?/g)[1],
                        top = spaceBetween(baseHour, startTime),
                        height = spaceBetween(startTime, endTime);

                    return {
                        subjectName: item.subjectName,
                        gradeName: height < (3 / 4 * unitHeight) ? '' : item.gradeName,
                        courseId: item.courseId,
                        type: item.type,
                        top: top,
                        height: height,
                        backgroundColor: subjectObj[item.subjectName],
                    }
                })
                td.html(template('template-courseTableItem', { items: couseArr }));
            }
        })

        // 无课程处理
        if (!hasDataFlag) {
            var dom = $('#noData').clone().show();
            dom.find('div').html('这周，暂无课程哦~');
            courseTable.find('div[data-date]:eq(0)').css('width', '100%').html(dom);
            courseTable.find('div[data-date]:gt(0)').remove();
        }
    }

    // 设置courseList高
    function setCourseListHeight() {
        courseList.add(noDataContainer).css({
            height: document.documentElement.clientHeight - (calendarDisplay.height() + 1) - (calendarContainer.height() + 1)
        })
    }

    // 绑定slide事件
    function bindSlide(item, options) {
        options = options || {};
        var switchDay = options.switchDay;
        var sildeSwitch = calendar.getSildeSwitch();
        sildeSwitch(item, function (item, ver) {
            //if (!calendar.isWeekMode) return;
            if (switchDay) {
                if (ver > 0) {
                    calendar.preDay();
                } else {
                    calendar.nextDay();
                }
            } else {
                if (ver > 0) {
                    calendar.preWeek();
                } else {
                    calendar.nextWeek();
                }
            }

            renderClassTable();
        }, null, $.extend({
            allowScrollY: true,
            touchmoveCallback: function (dirs) {
                var dirY = dirs.dirY;
                var dir = dirs.dir;

                if (Math.abs(dir) > Math.abs(dirY)) {
                    // 横向滑动
                    item.style.transform = 'translate(' + dir + 'px, 0)'
                }
            },
            touchendCallback: function () {
                item.style.transform = '';
            }
        }, options));
    }

    function initData() {

        // 初始化日历
        function initCalendar() {
            // 初始化日历
            calendar = new Calendar({
                container: calendarContainer[0],
                /**点击某一日期回调 */
                callback: function (date) {
                    var curDate = new Date().Format(),
                        year = date.substring(0, 4),
                        month = parseInt(date.substring(5, 7)),
                        text = '',
                        dateDiff = (+new Date(curDate) - +new Date(date)) / (24 * 60 * 60 * 1000),
                        dateArr = [-1, 0, 1];
                    if (dateArr.indexOf(dateDiff) > -1) {
                        text = ['明天', '今天', '昨天'][dateArr.indexOf(dateDiff)];
                    } else {
                        text = '加油';
                    }
                    currentHeaderObj = {
                        year: year,
                        month: month,
                        text: text,
                    }
                    currentDate = date;
                    renderDisplay();
                    renderCourseList();
                },
                /**切换月回调，查数据 */
                changeMonthCallback: function (curCalendar, date) {
                    var dateRange = curCalendar.getCurrentCalendarRange();
                    setTimeout(function () { initList(dateRange.startDate, dateRange.endDate); }, 0);
                },
                /**切换月和周模式回调 */
                switchMonthWeekModeCallback: function (obj) {
                    setCourseListHeight();
                },
                /**设置选中日期 */
                currentDate: storageStatus.currentDate,
            });

            // 返回上一页处理
            if (storageStatus.classTableModeFlag) {
                calendarDisplay.find('img').click();
            }

            setCourseListHeight();

            // 切换日
            bindSlide(courseList[0], { switchDay: true });
            bindSlide(noDataContainer[0], { switchDay: true });
        }

        initCalendar();
    }
})();