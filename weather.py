# Погодный виджет

import eel 
import pyowm
import requests
import datetime
import sqlite3
import json
import os.path
import xml.dom.minidom
from sqlalchemy import create_engine, Table, Column, String, Float, MetaData
from sqlalchemy.sql import select
from datetime import datetime, timedelta, date, time

PROVIDER_KEY_OWM = '40befaca84efdac3fdfb746214c91dab'
PROVIDER_KEY_VC = 'I3D60I88UB6KPSDAVGK38HNP5'

# Инициализация интерфейса
eel.init('interface')


class WeatherProviderVC:
    # Запрос на получение данных о погоде с сайта провайдера
    def get_data(self, location, start_date, end_date):
        url = 'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/weatherdata/history'
        
        params = {
            'aggregateHours': 24,
            'startDateTime': f'{start_date}T00:0:00',
            'endDateTime': f'{end_date}T23:59:59',
            'unitGroup': 'metric',
            'location': location,
            'key': PROVIDER_KEY_VC,
            'contentType': 'json',
        }
        
        data = requests.get(url, params).json()
        
        return [
            {
                'date': row['datetimeStr'][:10],
                'mint': row['mint'],
                'maxt': row['maxt'],
                'location': location,
                'humidity': row['humidity'],
            }
            for row in data['locations'][location]['values']
        ]


class WeatherProviderOWM():
    # Запрос на получение данных о погоде с сайта провайдера
    def get_now_weather(self, place):
        owm = pyowm.OWM(PROVIDER_KEY_OWM)

        mgr = owm.weather_manager()
        observation = mgr.weather_at_place(place)
        w = observation.weather

        status = w.detailed_status
        temp = w.temperature('celsius')['temp']
        temp_min = w.temperature('celsius')['temp_min']
        temp_max = w.temperature('celsius')['temp_max']

        return [
            str(status), 
            round(temp), 
            round(temp_min), 
            round(temp_max), 
        ]


class DB():
    # Запись в БД
    def write(self, data):
        engine = create_engine('sqlite:///weather.sqlite3')
        metadata = MetaData()
        weather = Table(
            'weather',
            metadata,
            Column('date', String),
            Column('mint', Float),
            Column('maxt', Float),
            Column('location', String),
            Column('humidity', Float),
        )
        metadata.create_all(engine)

        c = engine.connect()

        c.execute(weather.insert(), data)

    # Чтение из БД
    def read(self):
        fname = 'weather.sqlite3' 
        if os.path.exists(fname): 
            conn = sqlite3.connect("weather.sqlite3")
            cursor = conn.cursor()
            sql = "SELECT * FROM weather"
            cursor.execute(sql)
            return cursor.fetchall()
        else:
            return ''


class JSONFile():
    # Запись в json-file
    def write(self, data):
        fname = 'weather.json' 
        if os.path.exists(fname): 
            with open(fname, 'rb+') as f: 
                f.seek(-1, os.SEEK_END)
                f.truncate()
            with open(fname, 'a') as f: 
                for day in data:
                    f.write(',\n')
                    json.dump(day, f)
        else:
            with open(fname, 'a') as f: 
                json.dump(data, f)
            with open(fname, 'rb+') as f: 
                f.seek(-1, os.SEEK_END)
                f.truncate()
        with open(fname, 'a') as f:
            f.write(']')

    # Чтение из json-file
    def read(self):
        fname = 'weather.json' 
        if os.path.exists(fname): 
            with open(fname) as f: 
                return json.load(f)
        else: 
            return ''


# Преобразовывает ассоциативный список в массив
def convertAssociativeListArray(data):
    new_data = []

    for day in data:
        day_weather_list = []

        for val in day.values():
            temp = val
            day_weather_list.append(temp)

        new_data.append(day_weather_list)

    return new_data

# Преобразовывает список строк в массив
def convertListArray(data):
    new_data = []

    for row in data:
        new_data.append(row.replace('\'', '')[1 : -1].rsplit(', '))

    return new_data

# Возвращает все записи из хранилища DB / JSON file
def get_all_history_weather(type):
    weather_heet = []

    if type == 'DB':
        db = DB()
        for row in db.read():
            weather_heet.append(str(row))
    elif  type == 'JSON':
        json = JSONFile()
        for row in convertAssociativeListArray(json.read()):
            weather_heet.append(str(row))

    return weather_heet

# Возвращает погоду прошедших 7 дней в указанном месте 
def get_last_weak_weather(place, type = ''):
    provider = WeatherProviderVC()
    
    weather_heet = provider.get_data(place, str(datetime.now() - timedelta(days = 7))[:10], str(datetime.now() - timedelta(days = 1))[:10])

    if type == 'DB':
        return weather_heet
    else:
        return convertAssociativeListArray(weather_heet)

# Возвращает все записи из базы + 7 новых за последнюю неделю в указанном место
def update_history_weather(place, type):
    data = get_last_weak_weather(place, 'DB')

    db = DB()
    db.write(data)

    json = JSONFile()
    json.write(data)

# Возвращает курс валют на сегодняшний день от ЦБ
def get_exchange_rate():
    source = requests.get('http://www.cbr.ru/scripts/XML_daily.asp')
    main_text = source.text
    dom = xml.dom.minidom.parseString(main_text)
    dom.normalize()

    d = 0
    e = 0

    for valute in dom.getElementsByTagName("Valute"):
        if valute.attributes.item(0).value == 'R01235':
            d = round(float(valute.getElementsByTagName("Value")[0].firstChild.nodeValue.replace(',','.')), 2)
        if valute.attributes.item(0).value == 'R01239':
            e = round(float(valute.getElementsByTagName("Value")[0].firstChild.nodeValue.replace(',','.')), 2)

    return [d, e]

# Возвращает инфу о текущей погоде в указанном городе,
# Инфу за последние 7 дней в этом же городе,
# Всю БД
# Вызывается c фронта
@eel.expose
def get_weather(place):
    update_history_weather(place, 'DB')

    provider = WeatherProviderOWM()
    output = provider.get_now_weather(place)

    output.append(get_last_weak_weather(place))

    output.append(get_exchange_rate())

    return output

# Возвращает все данные из DB / JSON file в зависимости от переданного типа
# Вызывается c фронта
@eel.expose
def get_weather_history(type):
    output = []
    all_time_weather_sheet = get_all_history_weather(type)

    output.append(convertListArray(all_time_weather_sheet))

    return output

# Очистка хранилища в зависимости от переданного параметра
# Вызывается с фронта
@eel.expose
def clear_storage(param):
    if param == 'DB':
        os.remove('weather.sqlite3')
    elif param == 'JSON':
        os.remove('weather.json')
        

# Запуск интерфейса
eel.start('main.html', size = (500, 650))