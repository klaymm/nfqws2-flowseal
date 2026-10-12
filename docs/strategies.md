# Как стратегии Flowseal переведены на nfqws2

Источник - файлы `general*.bat` из Flowseal zapret-discord-youtube той версии, что записана в `build.conf`. Они написаны для winws (zapret1), а на роутере стоит nfqws2 (zapret2), который не понимает опции `--dpi-desync-*`: все приёмы в нём задаются через `--lua-desync`.

Переводит скрипт `dev/flowseal2nfqws.py`. Он скачивает `.bat` нужного релиза с GitHub и пишет `strategies/<id>.conf` с профилями для nfqws2 и `strategies/index.json` с названиями и описаниями для веб-интерфейса. Руками эти файлы не правятся: если перевод неверный, исправляется скрипт. Незнакомую опцию, список или фейк скрипт не пропускает молча, а останавливается с ошибкой.

## Как стратегия попадает в конфиг

В шаблоне `nfqws2.conf` есть строка `@STRATEGY@`. При установке и смене стратегии утилита подставляет на её место файл стратегии, а интерфейс провайдера, IPv6 и версию конфига берёт с роутера.

Все профили стратегии лежат в `NFQWS_ARGS_CUSTOM` в том же порядке, что у Flowseal, поэтому срабатывает тот же первый подходящий профиль. Последний профиль, который скрипт запуска пакета сам собирает из `NFQWS_ARGS` и `NFQWS_EXTRA_ARGS`, выключен через `--skip`.

Все фейки Flowseal подключены в шаблоне, поэтому стратегии переключаются без смены списка `--blob`. Новый конфиг сначала проверяется через `nfqws2 --dry-run`. Если nfqws2 с ним не запустился, возвращается прежний.

## Опции

| winws (zapret1) | nfqws2 (zapret2) |
|---|---|
| `--dpi-desync=fake` + `--dpi-desync-fake-tls=X` | `--payload=tls_client_hello --lua-desync=fake:blob=X` |
| несколько `--dpi-desync-fake-tls` | несколько `fake` подряд в том же порядке |
| `--dpi-desync-fake-tls=^!` | `blob=fake_default_tls` |
| `fake` без `--dpi-desync-fake-tls` | `blob=fake_default_tls:tls_mod=rnd,rndsni,dupsid`, как делал zapret1 |
| `--dpi-desync-fake-tls-mod=M` | `tls_mod=M` у последнего фейка перед ним |
| `--dpi-desync-fake-http=X` | `--payload=http_req --lua-desync=fake:blob=X` |
| `--dpi-desync-fake-quic=X` | `--payload=quic_initial --lua-desync=fake:blob=X` |
| `--dpi-desync-fake-discord=X --dpi-desync-fake-stun=X` | `--payload=discord_ip_discovery,stun --lua-desync=fake:blob=X` |
| `--dpi-desync-any-protocol` + `--dpi-desync-fake-unknown-udp=X` | `--payload=unknown --lua-desync=fake:blob=X:payload=unknown` |
| `--dpi-desync-repeats=N` | `repeats=N` у фейков. Части разбиения уходят по одному разу, как и в zapret1 |
| `multisplit` + `split-pos`, `split-seqovl`, `split-seqovl-pattern` | `multisplit:pos=…:seqovl=…:seqovl_pattern=…` |
| `multidisorder` | `multidisorder_legacy`, вариант, совместимый с nfqws1 |
| `fakedsplit` | `fakedsplit`, повторы действуют только на фейки, как в zapret1 |
| `hostfakesplit` + `--dpi-desync-hostfakesplit-mod=host=X` | `hostfakesplit:host=X`, повторы так же только у фейков |
| `syndata` | `--payload=all --lua-desync=syndata` |
| `--dpi-desync-fooling=ts` | `tcp_ts=-600000`, значение zapret1 по умолчанию |
| `--dpi-desync-fooling=badseq` | `tcp_seq=-10000:tcp_ack=-66000` или `tcp_seq` из `--dpi-desync-badseq-increment` |
| `--dpi-desync-fooling=md5sig` | `tcp_md5` |
| `--ip-id=zero` | `ip_id=zero` |
| `--dpi-desync-cutoff=nN` | `--out-range=<nN` |
| `--filter-l3`, `--filter-tcp`, `--filter-udp`, `--filter-l7`, `--hostlist-domains`, `--hostlist-exclude-domains` | без изменений |
| `--wf-tcp`, `--wf-udp` | `TCP_PORTS` и `UDP_PORTS` в шаблоне, по ним строятся правила iptables |
| файл `.bin` | `--blob=имя:@/opt/etc/nfqws2/blobs/файл.bin` в шаблоне |

У всех TCP-приёмов стоит `tcp_ts_up`: метка времени TCP идёт первой среди опций, так строил пакеты zapret1. Строки с `^` в списках означают "без поддоменов", nfqws2 понимает это так же.

## Списки

| Flowseal | На роутере |
|---|---|
| `list-general.txt` | `lists/list-general.list` |
| `list-google.txt` | `lists/list-google.list` |
| `list-exclude.txt` | `lists/list-exclude.list` |
| `ipset-exclude.txt` | `lists/ipset-exclude.list` |
| `ipset-all.txt` | `lists/ipset-all.list` и свой `lists/ipset.list` |
| `list-general-user.txt` | свой `lists/user.list` |
| `list-exclude-user.txt` | свой `lists/exclude.list` |
| `ipset-exclude-user.txt` | свой `lists/ipset_exclude.list` |

К профилям по IP добавлен `--ipset-ip=0.0.0.0`: без него профиль с двумя пустыми списками IP срабатывал бы на весь трафик. В `ipset-all.list` у Flowseal заглушка `203.0.113.113/32` (режим IPSet "none"), так что по IP сборка ничего не трогает, пока вы не впишете адреса в `ipset.list`.

## Проверка меток времени TCP

Часть фейков держится на `fooling=ts`, а он работает, только если у устройства включены метки времени TCP. Flowseal на Windows включает их сам (`netsh interface tcp set global timestamps=enabled` в service.bat). Через роутер же идут все устройства, а у Windows метки по умолчанию выключены. Без них фейк дошёл бы до сервера как настоящие данные и сломал соединение.

Поэтому перед такими фейками стоит `condition:iff=cond_tcp_has_ts:instances=N`. Есть метки - работает вся стратегия. Нет меток - фейки пропускаются, остаются приёмы, которым метки не нужны. С `md5sig` или `badseq` проверка не ставится: там фейк отбрасывается сервером и без меток. В веб-интерфейсе такие стратегии отмечены значком TS.

## Что переведено не точно

- ALT3 и ALT13 используют у `hostfakesplit` режим `altorder`, а в zapret2 его нет. Берётся обычный порядок частей, в интерфейсе такие стратегии отмечены "≈".
- Game Filter не перенесён: у Flowseal он по умолчанию выключен.
- Фейк для голоса Discord - `quic_initial_steamcommunity_com.bin`: у Flowseal это содержимое `ACTIVE_DISCORD_UDP.bin` по умолчанию.
