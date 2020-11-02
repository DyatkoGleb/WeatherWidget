let dollar = document.getElementById('dollar'),
    euro = document.getElementById('euro'),
    btnHint = document.getElementById('btn-hint'),
    btnClearStorage = document.getElementById('btn-clear-storage'),
    card = document.getElementById('card'),
    todaySideCard = document.getElementById('today-side-card'),
    hintSideCard = document.getElementById('hint-side-card')
    place = document.getElementById('location'),
    btnSearch = document.getElementById('btn-search'),
    btnChangeView = document.getElementById('btn-change-wiew'),
    btnChangeResource = document.getElementById('btn-change-resource'),
    viewBlock = document.getElementById('view-block'),
    listDays = document.getElementById('list-days'),
    listAllQueries = document.getElementById('list-all-queries'),
    dbBlock = document.getElementById('data-storage'),
    titleDataStorageTable = document.getElementById('title-data-storage-table'),

// После загрузки окна
window.onload = () => {
    displayWeather()
}

// Событие наведения на подсказку
btnHint.addEventListener('mouseover',() => {
    card.style.transform = 'rotateY(180deg)'
})
// Событие un'наведения на подсказку
btnHint.addEventListener('mouseout', () => {
    card.style.transform = 'rotateY(0deg)'
})

async function clearStorage() {
    let param 

    btnChangeResource.classList.contains('DB') == true ? param = 'DB' : param = 'JSON'

    await eel.clear_storage(param)()
    showAnotherStorage(param)
}

// Режим изменения населённого пункта
place.addEventListener ('focus', () => { 
    focusLocation()
})
function focusLocation() {
    btnSearch.classList.remove('d-none')
    place.classList.add('focus')
    place.style.padding = '0px 16px 2px 16px'
    place.style.border = '2px solid #fffa'
}

// Выход из режима изменения населённого пункта
place.addEventListener ('focusout',  () => { 
    setTimeout(() => {
        btnSearch.classList.add('d-none')
        place.classList.remove('focus')
        place.style.padding = '2px 16px 4px 16px'
        place.style.border = 'none'
    }, 100)
})

// Запрос данных
async function displayWeather() {
    let result = await eel.get_weather(place.innerText)()
    console.log(['main', result])
    
    document.getElementById('status').innerHTML = result[0]
    document.getElementById('temp').innerHTML = result[1] + '&deg;'
    document.getElementById('temp-min').innerHTML = 'Min. ' + result[2] + '&deg;, '
    document.getElementById('temp-max').innerHTML = 'Max. ' + result[3] + '&deg;'

    listDays.innerHTML = ''
    result[4].forEach(day => {
        listDays.appendChild(createDay(day))
    })
    
    let pin = document.createElement('div')

    pin.classList = 'text-center'
    pin.style.paddingTop = '10px'
    pin.style.color = '#fff5'
    pin.innerText ='Должно выводиться 7 дней, но из-за каких-то траблов на сайте, почти всегда выводится 2'
    
    listDays.appendChild(pin)

    // listAllQueries.innerHTML = ''
    // result[5].forEach(day => {
    //     listAllQueries.appendChild(createDay(day, 'all'))
    // })

    dollar.innerText = result[5][0]
    euro.innerText = result[5][1]

    btnHint.style.transform = 'rotateY(720deg)'

    btnChangeResource.classList.contains('DB') == true ? showAnotherStorage('DB') : showAnotherStorage('JSON')
}

// Создание блока с информацией о погоде в конкретный день
function createDay(day, type) {
    let block = document.createElement('div'),
        location = document.createElement('div'),
        date = document.createElement('div'),
        minT = document.createElement('div'),
        maxT = document.createElement('div'),
        hum = document.createElement('div')
        
        block.classList = 'day-weather d-flex justify-content-between'

        if (type == 'all') {
            location.style.width = "75px"
            location.innerText = day[3]
            block.appendChild(location)
        }

        date.innerText = day[0]
        minT.innerText = day[1]
        maxT.innerText = day[2]
        hum.innerText = day[4]

        block.appendChild(date)
        block.appendChild(minT)
        block.appendChild(maxT)
        block.appendChild(hum)

        return block
}

// Смена выводимой инфы
function changeView() {
    btnChangeView.classList.contains('DB') == true ? showWeekWeather() : showAllQueriesWeather()
}

// Показать записи из хранилища
function showAllQueriesWeather() {
    btnChangeView.classList.add('DB')
    btnChangeView.style.transform = 'rotate(180deg)'
    viewBlock.style.left = 'calc(-100% - 60px)'
    btnChangeResource.style.marginRight = 0
    
    if (listAllQueries.innerHTML != '') {
        btnClearStorage.style.bottom = '10px'
    }
}

// Показать инфу за последние 7 дней
function showWeekWeather() {
    btnChangeView.classList.remove('DB')
    btnChangeView.style.transform = 'rotate(0deg)'
    viewBlock.style.left = '0'
    btnChangeResource.style.marginRight = '-37px'
    btnClearStorage.style.bottom = '-30px'

    setTimeout(() => {
        dbBlock.scrollTop = 0;
    }, 450);
}

// Сменить хранилище подгрузки данных (DB / JSON file)
function changeResource() {
    if (btnChangeResource.style.transform == '') {
        btnChangeResource.style.transform = 'rotate(180deg)'
    } else {
        degree = Number(btnChangeResource.style.transform.split('(')[1].split('d')[0]) + 180
        btnChangeResource.style.transform = 'rotate(' + degree + 'deg)'
    }

    if (!btnChangeResource.classList.contains('DB')) {
        btnChangeResource.classList.add('DB')
        titleDataStorageTable.innerText = 'From DB        '

        showAnotherStorage('DB')
    } else {
        btnChangeResource.classList.remove('DB')
        titleDataStorageTable.innerText = 'From JSON    '

        showAnotherStorage('JSON')
    }
    
    dbBlock.scrollTop = 0;
}

// Загрузить все записи из хранилища (DB / JSON file)
async function showAnotherStorage(type) {
    let result = await eel.get_weather_history(type)()
    console.log(['AnotherStorage', result])

    if (result[0] == '') {
        btnClearStorage.style.bottom = '-30px'

        listAllQueries.innerHTML = ''
    } else {
        btnClearStorage.style.bottom = '10px'

        listAllQueries.innerHTML = ''
        result[0].forEach(day => {
            listAllQueries.appendChild(createDay(day, 'all'))
        })
    }
}

// Прокрутка вверх
function scrollUp() {
    dbBlock.scrollTop -= 60
}

// Прокрутка вниз
function scrollDown() {
    dbBlock.scrollTop += 60
}

// Горячие клавиши
document.addEventListener('keydown', function(event) {
    // Фокусировка и запрос данных по нажатию на Enter 
    if (event.code == 'Enter') {
        if (place.classList.contains('focus')) {
            place.blur()
            displayWeather()
        } else {
            place.focus()
            event.preventDefault()
        }
    }
    if (event.code == 'ControlRight' && btnChangeView.classList.contains('DB') && !place.classList.contains('focus')) {
        changeResource()
    }
    // Смена выводимой инфы
    if (event.code == 'ArrowLeft' && !place.classList.contains('focus')) {
        showWeekWeather()
    }
    // Смена выводимой инфы
    if (event.code == 'ArrowRight' && !place.classList.contains('focus')) {
        showAllQueriesWeather()
    }
    // Прокрутка базы вверх
    if (event.code == 'ArrowUp' && btnChangeView.classList.contains('DB') && !place.classList.contains('focus')) {
        scrollUp()
    }
    // Прокрутка базы вниз
    if (event.code == 'ArrowDown' && btnChangeView.classList.contains('DB') && !place.classList.contains('focus')) {
        scrollDown()
    }
})