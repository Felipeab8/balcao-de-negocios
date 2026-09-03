/* Premier League — temporada 2025/26 (aproximação)
   Clube: n=nome, cid=cidade, lvl=nível do elenco, c1/c2=cores
   Jogador: [nome, posição, idade, overall] */
(window.LIGAS = window.LIGAS || []).push({
id: 'PL', nome: 'Premier League', pais: 'Inglaterra', nomes: 'ING', forca: 5,
clubes: [
{ n:'Arsenal', cid:'Londres', lvl:85, c1:'#EF0107', c2:'#0A1F44', p:[
  ['David Raya','GOL',30,85],['Kepa Arrizabalaga','GOL',31,77],['William Saliba','ZAG',24,87],['Gabriel Magalhães','ZAG',28,86],
  ['Cristhian Mosquera','ZAG',21,77],['Jurriën Timber','LAT',24,83],['Riccardo Calafiori','LAT',23,80],['Myles Lewis-Skelly','LAT',19,79],
  ['Declan Rice','VOL',26,88],['Martín Zubimendi','VOL',26,85],['Christian Nørgaard','VOL',31,77],['Martin Ødegaard','MEI',27,86],
  ['Eberechi Eze','MEI',27,84],['Bukayo Saka','PON',24,88],['Gabriel Martinelli','PON',24,82],['Noni Madueke','PON',23,79],
  ['Viktor Gyökeres','ATA',27,85],['Kai Havertz','ATA',26,83]] },
{ n:'Aston Villa', cid:'Birmingham', lvl:80, c1:'#670E36', c2:'#95BFE5', p:[
  ['Emiliano Martínez','GOL',33,85],['Ezri Konsa','ZAG',28,81],['Pau Torres','ZAG',28,81],['Tyrone Mings','ZAG',32,77],
  ['Ian Maatsen','LAT',23,78],['Matty Cash','LAT',28,77],['Lucas Digne','LAT',32,77],['Amadou Onana','VOL',24,80],
  ['Youri Tielemans','VOL',28,82],['Boubacar Kamara','VOL',26,80],['John McGinn','MEI',31,79],['Morgan Rogers','MEI',23,82],
  ['Donyell Malen','PON',26,78],['Jadon Sancho','PON',25,78],['Ollie Watkins','ATA',29,84]] },
{ n:'Bournemouth', cid:'Bournemouth', lvl:76, c1:'#DA291C', c2:'#0A0A0A', p:[
  ['Đorđe Petrović','GOL',26,78],['Marcos Senesi','ZAG',28,79],['Bafodé Diakité','ZAG',24,78],['James Hill','ZAG',23,74],
  ['Adrien Truffert','LAT',23,77],['Adam Smith','LAT',34,74],['Lewis Cook','VOL',28,77],['Alex Scott','VOL',22,77],
  ['Ryan Christie','MEI',30,77],['Antoine Semenyo','PON',25,82],['Justin Kluivert','PON',26,80],['Evanilson','ATA',26,79],
  ['Ben Doak','PON',20,76]] },
{ n:'Brentford', cid:'Londres', lvl:75, c1:'#E30613', c2:'#140F0F', p:[
  ['Caoimhín Kelleher','GOL',27,78],['Nathan Collins','ZAG',24,80],['Sepp van den Berg','ZAG',23,77],['Kristoffer Ajer','ZAG',27,76],
  ['Aaron Hickey','LAT',23,76],['Keane Lewis-Potter','LAT',24,77],['Jordan Henderson','VOL',35,76],['Yehor Yarmoliuk','VOL',21,76],
  ['Mikkel Damsgaard','MEI',25,79],['Kevin Schade','PON',23,78],['Dango Ouattara','PON',23,77],['Igor Thiago','ATA',24,79]] },
{ n:'Brighton', cid:'Brighton', lvl:78, c1:'#0057B8', c2:'#FFCD00', p:[
  ['Bart Verbruggen','GOL',23,80],['Jan Paul van Hecke','ZAG',25,79],['Lewis Dunk','ZAG',33,78],['Diego Gómez','VOL',22,76],
  ['Ferdi Kadıoğlu','LAT',26,78],['Maxim De Cuyper','LAT',25,78],['Carlos Baleba','VOL',21,82],['Yasin Ayari','VOL',22,77],
  ['Georginio Rutter','MEI',23,79],['Kaoru Mitoma','PON',28,82],['Yankuba Minteh','PON',21,79],['Brajan Gruda','PON',21,77],
  ['Danny Welbeck','ATA',34,77],['Stefanos Tzimas','ATA',19,75]] },
{ n:'Burnley', cid:'Burnley', lvl:71, c1:'#6C1D45', c2:'#99D6EA', p:[
  ['Martin Dúbravka','GOL',36,76],['Maxime Estève','ZAG',23,74],['Hjalmar Ekdal','ZAG',26,72],['Bashir Humphreys','ZAG',22,73],
  ['Quilindschy Hartman','LAT',24,74],['Connor Roberts','LAT',30,73],['Josh Cullen','VOL',29,75],['Josh Laurent','VOL',30,73],
  ['Lesley Ugochukwu','VOL',21,75],['Jaidon Anthony','PON',25,74],['Zian Flemming','ATA',27,74],['Armando Broja','ATA',24,74]] },
{ n:'Chelsea', cid:'Londres', lvl:84, c1:'#034694', c2:'#0A1F44', p:[
  ['Robert Sánchez','GOL',28,79],['Filip Jörgensen','GOL',23,76],['Levi Colwill','ZAG',22,82],['Wesley Fofana','ZAG',24,80],
  ['Trevoh Chalobah','ZAG',26,79],['Marc Cucurella','LAT',27,83],['Reece James','LAT',25,82],['Malo Gusto','LAT',22,79],
  ['Moisés Caicedo','VOL',24,87],['Roméo Lavia','VOL',21,79],['Enzo Fernández','MEI',24,85],['Cole Palmer','MEI',23,87],
  ['Pedro Neto','PON',25,80],['Estêvão','PON',18,80],['Alejandro Garnacho','PON',21,79],['Jamie Gittens','PON',21,77],
  ['João Pedro','ATA',24,82],['Liam Delap','ATA',22,78]] },
{ n:'Crystal Palace', cid:'Londres', lvl:78, c1:'#1B458F', c2:'#C4122E', p:[
  ['Dean Henderson','GOL',28,80],['Marc Guéhi','ZAG',25,84],['Maxence Lacroix','ZAG',25,80],['Chris Richards','ZAG',25,78],
  ['Daniel Muñoz','LAT',29,81],['Tyrick Mitchell','LAT',26,79],['Adam Wharton','VOL',21,82],['Jefferson Lerma','VOL',30,77],
  ['Daichi Kamada','MEI',29,79],['Ismaïla Sarr','PON',27,80],['Yeremy Pino','PON',23,78],['Jean-Philippe Mateta','ATA',28,81]] },
{ n:'Everton', cid:'Liverpool', lvl:75, c1:'#003399', c2:'#0B1B3C', p:[
  ['Jordan Pickford','GOL',31,84],['James Tarkowski','ZAG',32,79],['Jarrad Branthwaite','ZAG',23,83],['Michael Keane','ZAG',32,74],
  ['Vitalii Mykolenko','LAT',26,77],['Nathan Patterson','LAT',23,74],['Idrissa Gueye','VOL',36,77],['James Garner','VOL',24,77],
  ['Kiernan Dewsbury-Hall','MEI',27,77],['Jack Grealish','PON',30,80],['Iliman Ndiaye','PON',25,79],['Beto','ATA',27,76],
  ['Thierno Barry','ATA',22,76]] },
{ n:'Fulham', cid:'Londres', lvl:77, c1:'#CC0000', c2:'#0B0B0B', p:[
  ['Bernd Leno','GOL',33,80],['Joachim Andersen','ZAG',29,80],['Calvin Bassey','ZAG',25,79],['Issa Diop','ZAG',28,76],
  ['Antonee Robinson','LAT',28,80],['Kenny Tete','LAT',29,76],['Sander Berge','VOL',27,79],['Saša Lukić','VOL',29,78],
  ['Emile Smith Rowe','MEI',25,77],['Harry Wilson','MEI',28,77],['Alex Iwobi','PON',29,80],['Adama Traoré','PON',29,76],
  ['Raúl Jiménez','ATA',34,78],['Rodrigo Muniz','ATA',24,77]] },
{ n:'Leeds United', cid:'Leeds', lvl:73, c1:'#FFCD00', c2:'#1D428A', p:[
  ['Lucas Perri','GOL',27,77],['Joe Rodon','ZAG',27,76],['Pascal Struijk','ZAG',26,76],['Jaka Bijol','ZAG',26,76],
  ['Jayden Bogle','LAT',25,74],['Gabriel Gudmundsson','LAT',26,75],['Ethan Ampadu','VOL',25,77],['Anton Stach','VOL',26,77],
  ['Ilia Gruev','VOL',25,74],['Brenden Aaronson','MEI',25,75],['Daniel James','PON',27,76],['Noah Okafor','PON',25,76],
  ['Dominic Calvert-Lewin','ATA',28,76],['Joël Piroe','ATA',26,75]] },
{ n:'Liverpool', cid:'Liverpool', lvl:86, c1:'#C8102E', c2:'#00B2A9', p:[
  ['Alisson','GOL',33,87],['Giorgi Mamardashvili','GOL',25,80],['Ibrahima Konaté','ZAG',26,84],['Virgil van Dijk','ZAG',34,87],
  ['Joe Gomez','ZAG',28,78],['Andrew Robertson','LAT',31,82],['Jeremie Frimpong','LAT',24,81],['Milos Kerkez','LAT',21,80],
  ['Ryan Gravenberch','VOL',23,85],['Alexis Mac Allister','VOL',26,85],['Curtis Jones','VOL',24,79],['Dominik Szoboszlai','MEI',25,84],
  ['Florian Wirtz','MEI',22,87],['Mohamed Salah','PON',33,89],['Cody Gakpo','PON',26,82],['Alexander Isak','ATA',26,88],
  ['Hugo Ekitiké','ATA',23,83]] },
{ n:'Manchester City', cid:'Manchester', lvl:86, c1:'#6CABDD', c2:'#1C2C5B', p:[
  ['Gianluigi Donnarumma','GOL',26,87],['James Trafford','GOL',23,78],['Rúben Dias','ZAG',28,87],['Joško Gvardiol','ZAG',23,85],
  ['Nathan Aké','ZAG',30,80],['Matheus Nunes','LAT',27,79],['Rico Lewis','LAT',21,78],['Rodri','VOL',29,90],
  ['Tijjani Reijnders','VOL',27,84],['Nico González','VOL',23,80],['Bernardo Silva','MEI',31,85],['Phil Foden','MEI',25,86],
  ['Rayan Cherki','MEI',22,80],['Jérémy Doku','PON',23,84],['Savinho','PON',21,81],['Erling Haaland','ATA',25,91],
  ['Omar Marmoush','ATA',26,84]] },
{ n:'Manchester United', cid:'Manchester', lvl:82, c1:'#DA291C', c2:'#0A0A0A', p:[
  ['Senne Lammens','GOL',23,77],['Altay Bayındır','GOL',27,75],['Matthijs de Ligt','ZAG',26,83],['Leny Yoro','ZAG',20,80],
  ['Lisandro Martínez','ZAG',27,82],['Luke Shaw','LAT',30,78],['Noussair Mazraoui','LAT',28,79],['Patrick Dorgu','LAT',21,76],
  ['Casemiro','VOL',33,79],['Manuel Ugarte','VOL',24,79],['Kobbie Mainoo','VOL',20,79],['Bruno Fernandes','MEI',31,87],
  ['Mason Mount','MEI',26,78],['Bryan Mbeumo','PON',26,83],['Amad Diallo','PON',23,80],['Matheus Cunha','MEI',26,82],
  ['Benjamin Šeško','ATA',22,82]] },
{ n:'Newcastle United', cid:'Newcastle', lvl:82, c1:'#E8E8E8', c2:'#141414', p:[
  ['Nick Pope','GOL',33,80],['Aaron Ramsdale','GOL',27,78],['Sven Botman','ZAG',25,82],['Fabian Schär','ZAG',33,80],
  ['Malick Thiaw','ZAG',24,80],['Kieran Trippier','LAT',35,77],['Tino Livramento','LAT',23,80],['Lewis Hall','LAT',21,80],
  ['Sandro Tonali','VOL',25,85],['Bruno Guimarães','VOL',28,86],['Joelinton','VOL',29,82],['Harvey Barnes','PON',28,79],
  ['Anthony Gordon','PON',24,83],['Anthony Elanga','PON',23,79],['Nick Woltemade','ATA',23,80],['Yoane Wissa','ATA',29,79]] },
{ n:'Nottingham Forest', cid:'Nottingham', lvl:78, c1:'#DD0000', c2:'#0A0A0A', p:[
  ['Matz Sels','GOL',33,80],['John Victor','GOL',29,76],['Nikola Milenković','ZAG',27,82],['Murillo','ZAG',23,82],
  ['Ola Aina','LAT',28,79],['Neco Williams','LAT',24,78],['Elliot Anderson','VOL',22,80],['Nicolás Domínguez','VOL',27,78],
  ['Douglas Luiz','VOL',27,79],['Morgan Gibbs-White','MEI',25,83],['Callum Hudson-Odoi','PON',24,78],['Dan Ndoye','PON',24,79],
  ['Chris Wood','ATA',33,80],['Igor Jesus','ATA',24,77]] },
{ n:'Sunderland', cid:'Sunderland', lvl:73, c1:'#EB172B', c2:'#211E1F', p:[
  ['Robin Roefs','GOL',22,75],['Dan Ballard','ZAG',26,75],['Nordi Mukiele','ZAG',27,77],['Omar Alderete','ZAG',28,76],
  ['Trai Hume','LAT',23,76],['Reinildo','LAT',31,74],['Noah Sadiki','VOL',20,75],['Granit Xhaka','VOL',33,80],
  ['Enzo Le Fée','MEI',25,77],['Chemsdine Talbi','PON',20,75],['Simon Adingra','PON',23,76],['Wilson Isidor','ATA',25,76],
  ['Brian Brobbey','ATA',23,78]] },
{ n:'Tottenham Hotspur', cid:'Londres', lvl:81, c1:'#D9DEE8', c2:'#132257', p:[
  ['Guglielmo Vicario','GOL',29,81],['Cristian Romero','ZAG',27,85],['Micky van de Ven','ZAG',24,83],['Kevin Danso','ZAG',27,77],
  ['Destiny Udogie','LAT',23,80],['Pedro Porro','LAT',26,81],['Djed Spence','LAT',25,78],['Rodrigo Bentancur','VOL',28,80],
  ['Lucas Bergvall','VOL',19,79],['Pape Matar Sarr','VOL',23,79],['Xavi Simons','MEI',22,83],['Mohammed Kudus','PON',25,82],
  ['Brennan Johnson','PON',24,79],['Dominic Solanke','ATA',28,80],['Richarlison','ATA',28,79]] },
{ n:'West Ham United', cid:'Londres', lvl:76, c1:'#7A263A', c2:'#1BB1E7', p:[
  ['Alphonse Areola','GOL',32,78],['Max Kilman','ZAG',28,79],['Jean-Clair Todibo','ZAG',25,79],['Konstantinos Mavropanos','ZAG',27,77],
  ['Aaron Wan-Bissaka','LAT',27,79],['El Hadji Malick Diouf','LAT',21,76],['Tomáš Souček','VOL',30,79],['Guido Rodríguez','VOL',31,76],
  ['Lucas Paquetá','MEI',28,82],['Jarrod Bowen','PON',28,83],['Crysencio Summerville','PON',23,78],['Niclas Füllkrug','ATA',32,78],
  ['Callum Wilson','ATA',33,76]] },
{ n:'Wolverhampton', cid:'Wolverhampton', lvl:75, c1:'#FDB913', c2:'#231F20', p:[
  ['José Sá','GOL',32,79],['Emmanuel Agbadou','ZAG',27,77],['Toti Gomes','ZAG',26,76],['Yerson Mosquera','ZAG',24,74],
  ['Nélson Semedo','LAT',31,76],['Hugo Bueno','LAT',23,74],['André','VOL',24,79],['João Gomes','VOL',24,80],
  ['Jean-Ricner Bellegarde','MEI',26,76],['Marshall Munetsi','MEI',29,76],['Hwang Hee-chan','PON',29,76],['Rodrigo Gomes','PON',22,75],
  ['Jørgen Strand Larsen','ATA',25,79]] }
]});
