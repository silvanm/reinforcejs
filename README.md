# REINFORCEjs Experiments

Personal experiments for Deep-Q Network based on [REINFORCEjs](https://github.com/karpathy/reinforcejs) by Andrey 
Karpathy in bad code quality.

Check `/cars` and `/silvan` for two demos. 

## Run frontend web server

    http-server
    
Open [http://127.0.0.1:8080/cars/index.html](http://127.0.0.1:8080/cars/index.html)

## Run backend web server

Used to backup brains.

    cd server
    export FLASK_DEBUG=1
    export FLASK_APP=app.py 
    flask run
    
To backup the brains to disk, run `saveAgents()` from the development console.