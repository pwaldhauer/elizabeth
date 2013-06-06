Elizabeth
=========

Ellie uses the recently released [https://dev.moves-app.com/](API) of [http://www.moves-app.com/](Moves) to export your carefully tracked movement data.

This is just a first quick shot at playing with the API, feel free to improve the export plugins, add others, fork and do stuff! Any help will be greatly appreciated.

(And it's my first public NodeJS project, so please be nice.)

Usage
-----

* Prerequisites: Install NodeJS

* Install it by cloning the Repo, downloading the .zip file or using npm install (COMING SOON)
* Use `npm install` to install the dependencies
* Use `./ellie.js` (or just `ellie` if installed via npm) to see usage information
* Configure your instance using `ellie init`
* Export your data using `ellie export`

Included exporters
------------------

* GoogleMapExport
    Exports the days activity as a Google Map, using the Static Map API.

    ![Sample image](https://s3-eu-west-1.amazonaws.com/knusperfiles/20130524.png)

* PlaintextExport
    Exports a short day summary as plain text.

    ![Sample image](https://s3-eu-west-1.amazonaws.com/knusperfiles/ellieplaintext.png)





