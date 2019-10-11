FROM python:3.6.9-alpine

WORKDIR /usr/src/app

# install psycopg2
RUN apk update \
    && apk add build-base \
    && apk add --virtual build-deps gcc python3-dev musl-dev \
    && apk add postgresql-dev \
    # use psycopg2-binary instead of psycopg2
    && pip install psycopg2-binary \
    && apk del build-deps

RUN pip install --upgrade pip
COPY ./requirements.txt /usr/src/app/requirements.txt
RUN pip install -r requirements.txt

COPY ./entrypoint.sh /usr/src/app/entrypoint.sh
COPY . /usr/src/app/

ENTRYPOINT ["./entrypoint.sh"]
