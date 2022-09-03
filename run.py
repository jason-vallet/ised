from ISEDApp import app
# from app import views
# app.add_url_rule(rule='/',endpoint='home',view_func=views.index)
if __name__ == '__main__':
    #app.run(host='0.0.0.0')
    app.run(debug=True)