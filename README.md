# nfqws2-flowseal

Сборка nfqws2 для роутеров Keenetic и Netcraze, с которой через роутер работают Discord, включая голосовые каналы, и YouTube. nfqws2 - программа из проекта [zapret2](https://github.com/bol-van/zapret2): она меняет первые пакеты соединения так, чтобы система блокировок провайдера не узнала сайт.

Обход работает на самом роутере, на телефоны и компьютеры ничего ставить не нужно. Внутри все стратегии и списки сайтов из [Flowseal zapret-discord-youtube](https://github.com/Flowseal/zapret-discord-youtube), переделанные под zapret2. Стратегия - это набор приёмов обхода, по умолчанию включена ALT11. Пакет nfqws2 берётся из [nfqws2-keenetic](https://github.com/nfqws/nfqws2-keenetic), а веб-интерфейс переделан из [nfqws-keenetic-web](https://github.com/nfqws/nfqws-keenetic-web).

## Установка

Нужен Entware, менеджер пакетов для роутера ([во встроенную память](https://help.keenetic.com/hc/ru/articles/360021888880) или [на флешку](https://help.keenetic.com/hc/ru/articles/360021214160)), и компонент "Модули ядра подсистемы Netfilter" в веб-интерфейсе роутера. Зайдите на роутер по SSH, наберите `exec sh` и выполните:

```
opkg update && opkg install ca-certificates wget-ssl && wget -qO- https://raw.githubusercontent.com/klaymm/nfqws2-flowseal/main/install.sh | sh
```

Скрипт всё поставит и спросит про автообновление и пароль для веб-интерфейса. Если первый `opkg update` висит дольше минуты, прервите его (Ctrl+C) и запустите команду снова.

## Что вы можете делать

Веб-интерфейс открывается на порту 90 роутера, например `http://192.168.1.1:90`. Там вы можете сменить стратегию, если ALT11 не помогает, дописать свои сайты в `user.list`, задать пароль и включить автообновление, а у непонятных мест есть подсказки "?". То же доступно по SSH:

```
nfqws2-flowseal status              что стоит и работает ли nfqws2
nfqws2-flowseal strategy            список стратегий
nfqws2-flowseal strategy alt5       включить другую стратегию
nfqws2-flowseal policy              политики роутера и выбор устройств
nfqws2-flowseal update              поставить новую версию сборки
nfqws2-flowseal update --check      показать, что изменится
nfqws2-flowseal autoupdate on|off   обновляться самому раз в сутки
nfqws2-flowseal password off        входить без пароля, если он забыт
nfqws2-flowseal remove              удалить всё
```

Какие устройства обрабатывать, выбирается на вкладке "Стратегия": все, только устройства из политики доступа роутера или все, кроме них. Конфиг вручную не правьте, сборка его перезаписывает.

## Чего не умеет

Сборка проверена только на Netcraze Ultra. Game Filter из Flowseal не перенесён, ALT3 и ALT13 переведены приближённо, подробности в [docs/strategies.md](docs/strategies.md).

## Лицензия

Списки и фейки в `flowseal/` и веб-интерфейс в `web/` распространяются по лицензии MIT, тексты лежат в этих папках.
