var htmlHelper = (function()
{
	var wikiUrl = "https://wiki.openstreetmap.org/wiki/";

	var addDataset = function (country, id)
	{
		var displayname = datasets[country][id].name;
		if (!document.getElementById(country + "Section"))
		{
			var settingsSection = document.getElementById("datasetSection");
			var innerHTML = settingsSection.innerHTML;
			innerHTML += '<div class="countryHeader" onclick="htmlHelper.collapseSection(\'' + country + '\')">&nbsp;&nbsp;' +
					country +
					' <small><a title="OpenStreetMap wiki" href="' + wikiUrl + 'POI_Importer/Datasets/' + country + '">info</a></small>' +
					'<div class="collapser" id="' + country + 'Collapser"></div>' +
					'</div>' +
					"<div id='" + country + "Section'></div>";
			settingsSection.innerHTML = innerHTML;
			collapseSection(country);
		}
		var section = document.getElementById(country + "Section");
		var innerHTML = section.innerHTML;
		innerHTML += '&nbsp;&nbsp;' +
			'<input type="checkbox" id="' + id + 'Dataset" onchange="toggleDataset(\'' + id + '\',this)" /> ' +
			'<label for="' + id + 'Dataset">' + displayname + '</label>, ' +
			'<small id="'+id+'Update"></small>, ' +
			'<small><a title="OpenStreetMap wiki" href="' + wikiUrl + 'POI_Importer/Datasets/' + country + '/' + displayname + '">info</a></small>' +
			'<br/>';
		section.innerHTML = innerHTML;
	};

	var getPopup = function (datasetName, tileName, idx)
	{
		var point = tiledData[datasetName][tileName].data[idx];
		var settings = datasetSettings[datasetName];
		var area = "?left="   + (point.coordinates.lon - 0.001) +
			"&right="         + (point.coordinates.lon + 0.001) +
			"&top="           + (point.coordinates.lat + 0.001) +
			"&bottom="        + (point.coordinates.lat - 0.001);
		var popupHtml = "<table style='border-collapse:collapse'>" +
			"<tr>" +
			"<th colspan='3'>Importovaná data (<a onclick='josmHelper.importPoint(\""+datasetName+"\",\""+tileName+"\",\""+idx+"\")' title='Otevřít bod v JOSM'>JOSM</a>)</th>" +
			"<th colspan='3'>OSM data (<a onclick='josmHelper.openOsmArea(\""+area+"\")' title='Otevřít oblast v JOSM'>JOSM</a>)</th>" +
			"</tr>";

		for (var t = 0; t < settings.tagmatch.length; t++)
		{
			var tag = settings.tagmatch[t];
			if (!point.properties[tag.key])
				continue;
			var score = 0;
			if (point.osmElement && point.osmElement.tags)
				score = comparisonAlgorithms[tag.algorithm || "equality"](
					point.properties[tag.key],
					point.osmElement.tags[tag.key]) * (tag.importance || 1);
			var colour = hslToRgb(score / 3, 1, 0.8);
			popupHtml += "<tr style='background-color:" + colour + ";'><td>";
			popupHtml += "<b>" + tag.key + "</b></td><td> = </td><td> ";
                        if (tag.key === 'website') {
                            popupHtml += '<a href="'+ point.properties[tag.key] +'">'+ point.properties[tag.key] +'</a>';
                        } else {
                            popupHtml += point.properties[tag.key];
                        }
			popupHtml += "</td><td>";
			popupHtml += "<b>" + tag.key + "</b></td><td> = </td><td>";
			if (point.osmElement && point.osmElement.tags && point.osmElement.tags[tag.key])
                        if (tag.key === 'website') {
                            popupHtml += '<a href="'+ point.osmElement.tags[tag.key] +'">'+ point.osmElement.tags[tag.key] +'</a>';
                        } else {
                            popupHtml +=point.osmElement.tags[tag.key];
                        }
			else
				popupHtml += "N/A";

			popupHtml += "</td></tr>";

		}

		// Show fixme=* tag if exists
		if (point.osmElement && point.osmElement.tags && point.osmElement.tags['fixme']) {
			popupHtml += "<tr style='background-color: #ff9999;'><td>";
			popupHtml += "<b></b></td><td></td><td>";
			popupHtml += "</td><td>";
			popupHtml += "<b>fixme</b></td><td> = </td><td>";
			popupHtml += point.osmElement.tags['fixme'];
			popupHtml += "</td></tr>";
		}

		popupHtml += "<tr><td colspan='3' style='text-align: right'> " + point.coordinates.lat.toFixed(6) + ', ' + point.coordinates.lon.toFixed(6) + "</td>";
		if (point.osmElement.lat) {
			popupHtml += "<td colspan='3' style='text-align: right'> " + point.osmElement.lat.toFixed(6) + ', ' + point.osmElement.lon.toFixed(6) + "</td></tr>";
		} else {
			popupHtml += "<td colspan='3' style='text-align: right'>N/A</td></tr>";
		}

		if (point.properties["_note"])
			popupHtml += "<tr><td colspan='6'>" + point.properties["_note"] + "</td></tr>";
		popupHtml += "</table>";
		return popupHtml;
	};

	var displayComments = function(comments, dataset, feature)
	{
		var div = document.getElementById("commentsContent");
		div.innerHTML = "";
		for (var i = 0; i < comments.length; i++)
		{
			var time = new Date(+comments[i].timestamp * 1000);
			var comment = div.appendChild(document.createElement("div"));
			comment.setAttribute("class", "comment");
			comment.appendChild(document.createElement("b"))
				.appendChild(document.createTextNode(comments[i].username + " "));
			comment.appendChild(document.createElement("small"))
				.appendChild(document.createTextNode(time.toLocaleString()));
			comment.appendChild(document.createElement("br"));
			comment.appendChild(document.createTextNode(comments[i].comment));
		}
		if (loggedInToOsm)
		{
			document.getElementById("newComment").style.display = "block";
			document.getElementById("newCommentButton").onclick = function()
			{
				commentsHelper.addComment(dataset, feature);
			}
		}
	};

	var clearComments = function()
	{
		document.getElementById("commentsContent").innerHTML = "Vyberte vlastnost pro zobrazení komentářů.";
		document.getElementById("newComment").style.display = "none";
	};

	var collapseSection = function (id)
	{
		var section = document.getElementById(id + "Section");
		var collapser = document.getElementById(id + "Collapser");
		if (!section || !collapser)
			return;
		if (section.style.display == "none")
		{
			section.style.display = "block";
			collapser.innerHTML = "\u25b2";
		}
		else
		{
			section.style.display = "none";
			collapser.innerHTML = "\u25bc";
		}
	};

	return {
		"addDataset": addDataset,
		"collapseSection": collapseSection,
		"getPopup": getPopup,
		"displayComments": displayComments,
		"clearComments": clearComments,
	};
})();
