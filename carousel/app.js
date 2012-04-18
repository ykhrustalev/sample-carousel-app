/**
 * Please welcome to follow me on github
 * https://github.com/ykhrustalev
 *
 * DataArt, Enjoy IT!
 *
 * author Yuri Khrustalev <yuri.khrustalev@gmail.com>
 *
 */

// подсветка в IDE
"use strict";

//
// инициализация среды исполнения
//

// наличие touch в устройстве
var hasTouch = 'ontouchstart' in window;

/**
 * Компонент для хранения названий событий браузера
 */
var Events = {
  hasTouch: hasTouch,
  resizeEvent: ('onorientationchange' in window )
      ? 'orientationchange'
      : 'resize',
  clickEvent: hasTouch ? 'tap' : 'click', // синтетическое
  startEvent: hasTouch ? 'touchstart' : 'mousedown', // один раз
  moveEvent: hasTouch ? 'touchmove' : 'mousemove', // постоянно
  endEvent: hasTouch ? 'touchend' : 'mouseup', // один раз
  cancelEvent: hasTouch ? 'touchcancel' : 'mouseup'
};

// webkit событие, окончание анимации
Events.transitionEndEvent = 'webkitTransitionEnd';


//
// Карусель
//

// свойства каруслеи по умолчанию
var defaultSliderOptions = {
  viewPort: null,
  slidesContainer: null,
  auto: false,
  autoDelay: 5,
  slidingTime: 1,
  resetTime: 2,
  ratio: 0.2
};

/**
 * Конструктор карусели
 * Параметры иницализации могут включають все поля из 'defaultSliderOptions',
 * Конструктор используют значения по умолчанию для отсутствующих свойств
 */
function Slider(options) {
  // объединений параметров, переданных клиентом и значений по умолчанию
  this.options = $.extend(defaultSliderOptions, options);

  // выставление начальных параметров
  this.transitionX = 0; // хранит смещение анимации
  this.currentSlide = 0; // текущий слайд

  var slides = this.options.slidesContainer.children();
  this.slideWidth = slides.first().width(); // ширина одного слайда
  this.slidesCnt = slides.length;  // количество слайдов в карусели

  // привязка событий для управелния каруслеью
  // события привязываются к контейнеру, который будет анимироваться
  var node = this.options.slidesContainer[0];
  node.addEventListener(Events.startEvent, this, false);
  node.addEventListener(Events.moveEvent, this, false);
  node.addEventListener(Events.endEvent, this, false);

  // привязка объекта к событию "окончание анимации"
  node.addEventListener(Events.transitionEndEvent, this, false);

  // выставление режима слайд шоу, определяется параметром конструктора
  this.setSlideShowState(this.options.auto);
}

// Прототип обхекта карусели, определяет API и содержит реализацию логики
Slider.prototype = {

  // обработчиик для событий браузера
  // привязка событий в конструкторе, осуществляется через
  // addEventListener(event, this, false);
  // переменная this оперделят вызов текущего обреботчика
  handleEvent: function(e) {
    // автомат для рапределения событий по обработчикам
    // события курсора заперещены на время исполнения анимации
    switch (e.type) {
      case Events.startEvent:
        if (!this.isLocked) {
          this._start(e);
        }
        break;
      case Events.moveEvent:
        if (!this.isLocked) {
          this._move(e);
        }
        break;
      case Events.endEvent:
        if (!this.isLocked) {
          this._end(e);
        }
        break;
      case Events.transitionEndEvent:
        this._animationEnd(e);
        break;
    }
  },

  // включить/выключить слайдшоу
  setSlideShowState: function(state) {
    if (state) {
      this._enableAutoSliding();
    } else {
      this._disableAutoSliding();
    }
  },

  // влючить режим слайд шоу
  _enableAutoSliding: function() {
    // внтури функции вызова по таймеру this равен не объекту карусели, а
    // равен функции самоого вызова, потому необходимо оперировать ссылкой на
    // карусель ' self'
    var self = this;
    // запуск цикличного события по таймеру, ссылка на таймер доступна для
    // отключения
    this.timer = setInterval(function() {
      // по таймеру будет вызван перезод на новый слайд или сброс карусели при
      // достижении границы
      if (!self.moveNext()) {
        self.reset();
      }
    }, this.options.autoDelay * 1000);  // таймер принимает время в милисекундах
  },

  // отключить режим слайд шоу
  _disableAutoSliding: function() {
    // уничтожаем сохроаненный таймер
    clearInterval(this.timer);
  },

  // перезод на следущий слайд в карусели,
  // фасад, использует более общий метод
  moveNext: function() {
    return this._moveByNormal(+1);
  },

  // перезод на предыдущий слайд в карусели,
  // фасад, использует более общий метод
  movePrev: function() {
    return this._moveByNormal(-1);
  },

  // метод для осуществления перезода на соседний слайд,
  // normal - шаг, определяющий переход на новый слайд
  _moveByNormal: function(normal) {

    // переход разрешен только в случае отсутствия текущей анимации
    if (!this.isLocked) {
      var newIndex = this.currentSlide + normal; // новый индекс слайда

      // определение возмможности перезод на новый слайд
      if (newIndex >= 0 && newIndex < this.slidesCnt) {
        this.currentSlide += normal; //  сохренение нового положения
        var x = -this.currentSlide * this.slideWidth; // расчет новой позиции
        this.isLocked = true; // перед началом анимации объеки лочится
        this._moveSlide(x, this.options.slidingTime); // анимация
        return true; // успешный выход
      }
    }

    // переход осуществить не удалось
    return false;
  },

  // сброс каруслеи на начальное состояние
  reset: function() {
    // работает только в случае отсутствия текущей анимации
    if (!this.isLocked) {
      this._moveSlide(0, this.options.resetTime);  // анимация
      this.currentSlide = 0; // сброс положения карусели
    }
  },

  //обработчик начала движения
  _start: function(e) {
    // выъявление объекта содердащего координаты курсора
    // e.touches[0] на устройствах с touch, е на десктопных браузерах
    var touch = e.touches ? e.touches[0] : e;
    // опеределение начального положения относительно смещения, вызванного
    // анимацией
    this.x0 = touch.pageX - this.transitionX;
    // абсолютная координата смешения
    this.x0Absolute = touch.pageX;
    // для десктопных браузеров необходимо следить за тем, что был произведен
    // клик, так как движение мыши без клика будет вызывать осбтие 'mousemove'
    this.isTracking = true;
  },

  // обработчик движения
  _move: function(e) {
    // проверка на наличие зарегистрированного клика/тача
    if (this.isTracking) {
      // определение координаты
      var touch = e.touches ? e.touches[0] : e,
          x = touch.pageX, // текущая координата
          newX = x - this.x0;  // новое положение для анимации, относительное

      // проверка на выход за границы контейнера
      var maxWidth = this.slideWidth * (this.slidesCnt - 1);
      if (newX >= 0 || newX <= -maxWidth) {
        return;
      }

      // сохранение последней координаты для окончания движения
      this.lastX = x;

      this._moveSlide(newX, 0); // мгновенная анимация
    }
  },

  // обработчик окончание движения
  _end: function(e) {
    // объект более не следит за движением
    this.isTracking = false;

    // абсолютное значение пройденного пути
    var track = this.lastX - this.x0Absolute,
    // порог, пройденный путь относительно ширины слайда
        ratio = Math.abs(track) / this.slideWidth,
    // нормаль для определения направления движения
        normal = (track) / Math.abs(track);

    // выносится решение о необходимости осуществления полного сдвига слайда
    if (ratio > this.options.ratio) {
      var newIndex = this.currentSlide - normal;
      // проверка за выход границ
      if (!(newIndex >= 0 && newIndex < this.slidesCnt)) {
        return
      }
      this.currentSlide = newIndex;
    }

    // блокирование объекта на время анимации
    this.isLocked = true;
    var x = -this.currentSlide * this.slideWidth;
    this._moveSlide(x, this.options.slidingTime); // анимация
  },

  // обработчик окончания анимации
  _animationEnd: function() {
    this.isLocked = false;   // разблокировака объекта
  },

  // хелпер для осуществления анимации
  _moveSlide: function(position, time) {
    time = time || 0;
    this.options.slidesContainer.anim({
          translateX: position + 'px', // метод анимации
          'transform-style': 'preserve-3d'// дополнительные параметры
        },
        time, // время анимации в секундах
        'easy' // функция Бизье для поведения анимации
    );

    // сохранение положения анимации
    this.transitionX = position;
  }
};


$(document).ready(function() {

  // инициализации карусели
  var slider = new Slider({
    viewPort: $('.viewPort'), // видимая часть карусели
    slidesContainer: $('.slidesContainer'), // контейнер слайдов
    autoDelay: 3 //
  });

  // приявка кнопки к действию карусели
  function bindControl(selector, callback) {
    // кнопка
    var node = document.querySelector(selector);
    // привязка события к кнопке
    node.addEventListener(Events.clickEvent, callback, false);
  }

  //
  // прязка контролов карусели
  //

  bindControl('.prev', function() {
    slider.movePrev();
  });

  bindControl('.next', function() {
    slider.moveNext();
  });

  bindControl('.reset', function() {
    slider.reset();
  });

  bindControl('.auto', function() {
    slider.setSlideShowState(true);
  });

  bindControl('.manual', function() {
    slider.setSlideShowState(false);
  });

});