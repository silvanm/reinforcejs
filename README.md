# Run frontend web server

    http-server
    
Open [http://127.0.0.1:8080/cars/index.html](http://127.0.0.1:8080/cars/index.html)

# Run backend web server

Used to backup brains.

    cd server
    export FLASK_DEBUG=1
    export FLASK_APP=app.py 
    flask run
    
To backup the brains to disk, run `saveAgents()` from the development console.