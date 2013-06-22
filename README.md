Elizabeth
=========

Ellie uses the recently released [API](https://dev.moves-app.com/) of [Moves](http://www.moves-app.com/) to export your carefully tracked movement data.

This is just a first quick shot at playing with the API, feel free to improve the export plugins, add others, fork and do stuff! Any help will be greatly appreciated.

(And it's my first public NodeJS project, so please be nice.)

Usage
-----

* Prerequisites: Install NodeJS

* Clone the repo/download the .zip and run `npm install` OR install using `sudo npm install -g elizabeth` :)
* Use `./ellie.js` (or just `ellie` if installed via npm) to see usage information
* Configure your instance using `ellie init`
* Export your data using `ellie export`

Included exporters
------------------

* **DayOneExport**: Exports right into your DayOne Journal!

    ![Sample image](https://s3-eu-west-1.amazonaws.com/knusperfiles/elliedayone.png)

* **GoogleMapExport**: Exports the days activity as a Google Map, using the Static Map API.

    ![Sample image](https://s3-eu-west-1.amazonaws.com/knusperfiles/elliemap.png)

* **PlaintextExport**: Exports a short day summary as plain text.

    ![Sample image](https://s3-eu-west-1.amazonaws.com/knusperfiles/ellieplaintext.png)





