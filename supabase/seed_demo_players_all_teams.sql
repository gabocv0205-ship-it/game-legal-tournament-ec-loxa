-- Completa la demostracion CHAMPIONS LOXA 2026 hasta 15 jugadores por equipo.
-- Conserva todos los jugadores existentes y solo agrega los que faltan.
-- Manchester United se conserva con la plantilla demo creada previamente.
-- El bloque es atomico: cualquier conflicto revierte toda la operacion.

do $$
declare
  v_tournament_id uuid;
  v_team record;
  v_slot integer;
  v_dorsal integer;
  v_current_players integer;
  v_player_name text;
  v_seeded_players integer := 0;
  v_famous_players text[] := array[
    'Lionel Messi', 'Diego Maradona', 'Alfredo Di Stefano', 'Gabriel Batistuta', 'Juan Roman Riquelme',
    'Mario Kempes', 'Daniel Passarella', 'Javier Zanetti', 'Javier Mascherano', 'Sergio Aguero',
    'Hernan Crespo', 'Pablo Aimar', 'Fernando Redondo', 'Claudio Caniggia', 'Oscar Ruggeri',

    'Pele', 'Ronaldo Nazario', 'Ronaldinho Gaucho', 'Romario', 'Rivaldo',
    'Kaka', 'Garrincha', 'Zico', 'Socrates', 'Cafu',
    'Roberto Carlos', 'Neymar Junior', 'Jairzinho', 'Tostao', 'Didi',

    'Kylian Mbappe', 'Zinedine Zidane', 'Thierry Henry', 'Michel Platini', 'Antoine Griezmann',
    'Karim Benzema', 'Patrick Vieira', 'Didier Deschamps', 'N''Golo Kante', 'Lilian Thuram',
    'Laurent Blanc', 'David Trezeguet', 'Franck Ribery', 'Hugo Lloris', 'Jean-Pierre Papin',

    'Xavi Hernandez', 'Andres Iniesta', 'Iker Casillas', 'Sergio Ramos', 'Sergio Busquets',
    'David Villa', 'Fernando Torres', 'Raul Gonzalez', 'Carles Puyol', 'Xabi Alonso',
    'Luis Suarez Miramontes', 'Emilio Butragueno', 'Fernando Hierro', 'Pep Guardiola', 'Andoni Zubizarreta',

    'Franz Beckenbauer', 'Gerd Muller', 'Lothar Matthaus', 'Miroslav Klose', 'Manuel Neuer',
    'Philipp Lahm', 'Toni Kroos', 'Bastian Schweinsteiger', 'Karl-Heinz Rummenigge', 'Michael Ballack',
    'Jurgen Klinsmann', 'Mesut Ozil', 'Andreas Brehme', 'Sepp Maier', 'Gunter Netzer',

    'Gianluigi Buffon', 'Paolo Maldini', 'Franco Baresi', 'Roberto Baggio', 'Francesco Totti',
    'Alessandro Del Piero', 'Andrea Pirlo', 'Fabio Cannavaro', 'Alessandro Nesta', 'Gennaro Gattuso',
    'Paolo Rossi', 'Dino Zoff', 'Gianni Rivera', 'Christian Vieri', 'Filippo Inzaghi',

    'Johan Cruyff', 'Marco van Basten', 'Ruud Gullit', 'Frank Rijkaard', 'Dennis Bergkamp',
    'Arjen Robben', 'Wesley Sneijder', 'Robin van Persie', 'Ronald Koeman', 'Ruud Krol',
    'Clarence Seedorf', 'Edgar Davids', 'Ruud van Nistelrooy', 'Johan Neeskens', 'Memphis Depay',

    'Eusebio', 'Luis Figo', 'Rui Costa', 'Deco', 'Pepe',
    'Bernardo Silva', 'Bruno Fernandes', 'Joao Moutinho', 'Ricardo Carvalho', 'Vitor Baia',
    'Nuno Gomes', 'Pauleta', 'Paulo Futre', 'Mario Coluna', 'Simao Sabrosa',

    'Bobby Charlton', 'Gary Lineker', 'David Beckham', 'Steven Gerrard', 'Frank Lampard',
    'Alan Shearer', 'Harry Kane', 'Bobby Moore', 'Gordon Banks', 'John Terry',
    'Ashley Cole', 'Sol Campbell', 'Paul Gascoigne', 'John Barnes', 'Michael Owen',

    'Luis Suarez', 'Diego Forlan', 'Edinson Cavani', 'Enzo Francescoli', 'Alcides Ghiggia',
    'Juan Schiaffino', 'Obdulio Varela', 'Diego Godin', 'Fernando Muslera', 'Alvaro Recoba',
    'Ruben Sosa', 'Paolo Montero', 'Federico Valverde', 'Rodrigo Bentancur', 'Sebastian Abreu',

    'Carlos Valderrama', 'Radamel Falcao', 'James Rodriguez', 'Rene Higuita', 'Faustino Asprilla',
    'Freddy Rincon', 'Mario Yepes', 'David Ospina', 'Juan Cuadrado', 'Ivan Cordoba',
    'Adolfo Valencia', 'Victor Aristizabal', 'Willington Ortiz', 'Luis Diaz', 'Juan Fernando Quintero',

    'Antonio Valencia', 'Ivan Kaviedes', 'Alex Aguinaga', 'Agustin Delgado', 'Edison Mendez',
    'Felipe Caicedo', 'Enner Valencia', 'Moises Caicedo', 'Piero Hincapie', 'Ivan Hurtado',
    'Ulises de la Cruz', 'Jose Francisco Cevallos', 'Carlos Tenorio', 'Gonzalo Plata', 'Robert Arboleda',

    'Alexis Sanchez', 'Arturo Vidal', 'Claudio Bravo', 'Ivan Zamorano', 'Marcelo Salas',
    'Elias Figueroa', 'Carlos Caszely', 'Charles Aranguiz', 'Gary Medel', 'Mauricio Isla',
    'Erick Pulgar', 'David Pizarro', 'Jorge Valdivia', 'Gonzalo Jara', 'Jose Pedro Fuenzalida',

    'Kevin De Bruyne', 'Eden Hazard', 'Thibaut Courtois', 'Romelu Lukaku', 'Vincent Kompany',
    'Dries Mertens', 'Jan Vertonghen', 'Toby Alderweireld', 'Marouane Fellaini', 'Axel Witsel',
    'Yannick Carrasco', 'Youri Tielemans', 'Enzo Scifo', 'Jean-Marie Pfaff', 'Jan Ceulemans',

    'Luka Modric', 'Davor Suker', 'Zvonimir Boban', 'Ivan Rakitic', 'Mario Mandzukic',
    'Ivan Perisic', 'Mateo Kovacic', 'Josko Gvardiol', 'Darijo Srna', 'Dario Simic',
    'Robert Prosinecki', 'Alen Boksic', 'Dominik Livakovic', 'Andrej Kramaric', 'Marcelo Brozovic',

    'Michael Laudrup', 'Brian Laudrup', 'Peter Schmeichel', 'Kasper Schmeichel', 'Christian Eriksen',
    'Simon Kjaer', 'Christian Poulsen', 'Thomas Gravesen', 'Jon Dahl Tomasson', 'Daniel Agger',
    'Nicklas Bendtner', 'Morten Olsen', 'Preben Elkjaer', 'Allan Simonsen', 'Soren Lerby',

    'Zlatan Ibrahimovic', 'Henrik Larsson', 'Tomas Brolin', 'Thomas Ravelli', 'Gunnar Nordahl',
    'Nils Liedholm', 'Gunnar Gren', 'Freddie Ljungberg', 'Kim Kallstrom', 'Alexander Isak',
    'Emil Forsberg', 'Victor Lindelof', 'Kennet Andersson', 'Stefan Schwarz', 'Martin Dahlin',

    'Robert Lewandowski', 'Zbigniew Boniek', 'Grzegorz Lato', 'Kazimierz Deyna', 'Wojciech Szczesny',
    'Jakub Blaszczykowski', 'Lukasz Piszczek', 'Grzegorz Krychowiak', 'Arkadiusz Milik', 'Piotr Zielinski',
    'Jerzy Dudek', 'Wlodzimierz Smolarek', 'Ernest Pohl', 'Wlodzimierz Lubanski', 'Jerzy Gorgon',

    'Pavel Nedved', 'Petr Cech', 'Tomas Rosicky', 'Karel Poborsky', 'Jan Koller',
    'Milan Baros', 'Patrik Berger', 'Antonin Panenka', 'Josef Masopust', 'Miroslav Kadlec',
    'Vladimir Smicer', 'Tomas Ujfalusi', 'Marek Jankulovski', 'Patrik Schick', 'Tomas Soucek',

    'Ferenc Puskas', 'Sandor Kocsis', 'Nandor Hidegkuti', 'Jozsef Bozsik', 'Zoltan Czibor',
    'Gyula Grosics', 'Florian Albert', 'Ferenc Bene', 'Balazs Dzsudzsak', 'Gabor Kiraly',
    'Dominik Szoboszlai', 'Zoltan Gera', 'Lajos Tichy', 'Janos Fazekas', 'Tibor Nyilasi',

    'Gheorghe Hagi', 'Gheorghe Popescu', 'Adrian Mutu', 'Cristian Chivu', 'Dan Petrescu',
    'Marius Lacatus', 'Florin Raducioiu', 'Bogdan Stelea', 'Ilie Dumitrescu', 'Ioan Lupescu',
    'Ilie Balaci', 'Nicolae Dobrin', 'Cornel Dinu', 'Rodion Camataru', 'Miodrag Belodedici',

    'Dragan Stojkovic', 'Sinisa Mihajlovic', 'Nemanja Vidic', 'Nemanja Matic', 'Dejan Savicevic',
    'Predrag Mijatovic', 'Darko Pancev', 'Vladimir Jugovic', 'Aleksandar Kolarov', 'Branislav Ivanovic',
    'Aleksandar Mitrovic', 'Dusan Vlahovic', 'Dusan Tadic', 'Safet Susic', 'Edin Dzeko',

    'Samuel Eto''o', 'Roger Milla', 'Thomas N''Kono', 'Rigobert Song', 'Vincent Aboubakar',
    'Andre Onana', 'Andre-Frank Zambo Anguissa', 'Patrick Mboma', 'Geremi Njitap', 'Marc-Vivien Foe',
    'Christian Bassogog', 'Nicolas Nkoulou', 'Emmanuel Kunde', 'Stephen Tataw', 'Francois Omam-Biyik',

    'Jay-Jay Okocha', 'Nwankwo Kanu', 'Rashidi Yekini', 'John Obi Mikel', 'Daniel Amokachi',
    'Emmanuel Amunike', 'Finidi George', 'Sunday Oliseh', 'Victor Ikpeba', 'Vincent Enyeama',
    'Ahmed Musa', 'Victor Osimhen', 'Alex Iwobi', 'Taribo West', 'Ikechukwu Uche',

    'Abedi Pele', 'Michael Essien', 'Asamoah Gyan', 'Sulley Muntari', 'Stephen Appiah',
    'Andre Ayew', 'Jordan Ayew', 'Samuel Kuffour', 'Thomas Partey', 'John Paintsil',
    'Kevin-Prince Boateng', 'Christian Atsu', 'John Mensah', 'Laryea Kingston', 'Richard Kingson',

    'Sadio Mane', 'El Hadji Diouf', 'Aliou Cisse', 'Kalidou Koulibaly', 'Edouard Mendy',
    'Idrissa Gueye', 'Boulaye Dia', 'Ismaila Sarr', 'Krepin Diatta', 'Henri Camara',
    'Khalilou Fadiga', 'Salif Diao', 'Papa Bouba Diop', 'M''Baye Niang', 'Bafetimbi Gomis',

    'Hidetoshi Nakata', 'Shunsuke Nakamura', 'Keisuke Honda', 'Shinji Kagawa', 'Yasuhito Endo',
    'Yuto Nagatomo', 'Eiji Kawashima', 'Shinji Okazaki', 'Takumi Minamino', 'Daichi Kamada',
    'Takehiro Tomiyasu', 'Kaoru Mitoma', 'Takefusa Kubo', 'Makoto Hasebe', 'Kazuyoshi Miura',

    'Son Heung-min', 'Cha Bum-kun', 'Kim Min-jae', 'Lee Kang-in', 'Hwang Hee-chan',
    'Hong Myung-bo', 'Ahn Jung-hwan', 'Ki Sung-yueng', 'Lee Young-pyo', 'Cho Gue-sung',
    'Hwang Sun-hong', 'Kim Joo-sung', 'Lee Dong-gook', 'Seol Ki-hyeon', 'Yoo Sang-chul',

    'Hugo Sanchez', 'Rafael Marquez', 'Guillermo Ochoa', 'Javier Hernandez', 'Cuauhtemoc Blanco',
    'Jorge Campos', 'Jared Borgetti', 'Andres Guardado', 'Hirving Lozano', 'Carlos Vela',
    'Raul Jimenez', 'Gerardo Torrado', 'Carlos Salcido', 'Pavel Pardo', 'Manuel Negrete',

    'Landon Donovan', 'Clint Dempsey', 'Christian Pulisic', 'Tim Howard', 'Brad Friedel',
    'Claudio Reyna', 'Brian McBride', 'DaMarcus Beasley', 'Jozy Altidore', 'Michael Bradley',
    'Carlos Bocanegra', 'Folarin Balogun', 'Tyler Adams', 'Weston McKennie', 'Alexi Lalas',

    'Keylor Navas', 'Paulo Wanchope', 'Bryan Ruiz', 'Joel Campbell', 'Celso Borges',
    'Hernan Medford', 'Walter Centeno', 'Rolando Fonseca', 'Mauricio Solis', 'Cristian Gamboa',
    'Kendall Waston', 'Alvaro Saborio', 'Christian Bolanos', 'Harold Wallace', 'Winston Parks'
  ];
begin
  if (
    select count(*)
    from public.tournaments
    where lower(btrim(name)) = 'champions loxa 2026'
      and status is distinct from 'deleted'
  ) <> 1 then
    raise exception 'Proteccion activa: debe existir exactamente un torneo activo llamado CHAMPIONS LOXA 2026';
  end if;

  select id into v_tournament_id
  from public.tournaments
  where lower(btrim(name)) = 'champions loxa 2026'
    and status is distinct from 'deleted';

  if (select count(*) from public.teams where tournament_id = v_tournament_id) <> 32 then
    raise exception 'Proteccion activa: CHAMPIONS LOXA 2026 debe tener exactamente 32 equipos';
  end if;

  if (
    select coalesce(max_players_per_team, 25)
    from public.tournaments
    where id = v_tournament_id
  ) < 15 then
    raise exception 'El limite configurado del torneo debe permitir al menos 15 jugadores por equipo';
  end if;

  if array_length(v_famous_players, 1) <> 465 then
    raise exception 'Proteccion interna: el banco demo debe contener exactamente 465 jugadores';
  end if;

  if (
    select count(*) from unnest(v_famous_players) player_name
  ) <> (
    select count(distinct lower(btrim(player_name))) from unnest(v_famous_players) player_name
  ) then
    raise exception 'Proteccion interna: el banco demo contiene nombres repetidos';
  end if;

  for v_team in
    select
      team.id,
      team.name,
      row_number() over (order by team.name, team.id)::integer as team_index,
      (select count(*) from public.players player where player.team_id = team.id) as current_players
    from public.teams team
    where team.tournament_id = v_tournament_id
      and lower(btrim(team.name)) <> 'manchester united'
    order by team.name, team.id
  loop
    if v_team.current_players < 15 then
      v_current_players := v_team.current_players::integer;
      for v_slot in 1..15 loop
        exit when v_current_players >= 15;
        v_player_name := v_famous_players[((v_team.team_index - 1) * 15) + v_slot];

        if not exists (
          select 1
          from public.players
          where tournament_id = v_tournament_id
            and lower(btrim(full_name)) = lower(btrim(v_player_name))
        ) and not exists (
          select 1
          from public.players
          where tournament_id = v_tournament_id
            and lower(btrim(cedula)) = lower(format(
              'DEMO-STAR-%s-%s',
              lpad(v_team.team_index::text, 2, '0'),
              lpad(v_slot::text, 2, '0')
            ))
        ) then

          select available.number into v_dorsal
          from generate_series(1, 99) available(number)
          where not exists (
            select 1
            from public.players player
            where player.team_id = v_team.id
              and player.jersey_number = available.number
          )
          order by available.number
          limit 1;

          if v_dorsal is null then
            raise exception 'El equipo % no tiene dorsales disponibles', v_team.name;
          end if;

          insert into public.players (
            tournament_id, team_id, full_name, cedula, jersey_number
          ) values (
            v_tournament_id,
            v_team.id,
            v_player_name,
            format('DEMO-STAR-%s-%s', lpad(v_team.team_index::text, 2, '0'), lpad(v_slot::text, 2, '0')),
            v_dorsal
          );

          v_current_players := v_current_players + 1;
          v_seeded_players := v_seeded_players + 1;
        end if;
      end loop;

      if v_current_players < 15 then
        raise exception 'No existen suficientes nombres demo disponibles para completar el equipo %', v_team.name;
      end if;
    end if;
  end loop;

  if exists (
    select 1
    from public.teams team
    where team.tournament_id = v_tournament_id
      and lower(btrim(team.name)) <> 'manchester united'
      and (select count(*) from public.players player where player.team_id = team.id) < 15
  ) then
    raise exception 'La verificacion final detecto equipos con menos de 15 jugadores';
  end if;

  raise notice 'Carga demo terminada: % jugadores agregados', v_seeded_players;
end $$;

select
  team.name as equipo,
  count(player.id) as jugadores_registrados
from public.teams team
join public.tournaments tournament on tournament.id = team.tournament_id
left join public.players player on player.team_id = team.id
where lower(btrim(tournament.name)) = 'champions loxa 2026'
  and tournament.status is distinct from 'deleted'
group by team.id, team.name
order by team.name;
