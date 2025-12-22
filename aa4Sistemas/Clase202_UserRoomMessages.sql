USE `mydb`;

insert into User(username, password) values("Primer_Usuario", "1234");

select * from User;

insert into Rooms(Name) values("La sala numero 3");

select * from Rooms;

insert into Message(User_id, Rooms_id, text, createDate) values(1,1,"El primer mensaje del mundo", now());

select * from Message;

insert into User(username, password) values("Segundo_Usuario", "1234");
insert into User(username, password) values("Tercer_Usuario", "1234");

select * from User;

insert into Rooms(name) values("La sala 2");


insert into Message(User_id , Rooms_id, text, createDate) values(2,1,"El segundo mensaje mundo", now());
insert into Message(User_id , Rooms_id, text, createDate) values(1,1,"jajaa eres el segundo", now());

select * from Message;

select * from Message where User_id = 1;
select * from Message where Rooms_id = 1;


select User.username, text, createDate from Message
inner join User on Message.User_id = User.id
where Rooms_id = 1;

select User.username from Message
inner join User on Message.User_id = User.id
where Rooms_id = 1
group by User_id;

-- Asi creamos las funciones
USE `mydb`;


create procedure GetUsersInRoom
(Rooms_id int)


select User_id, User.username from Message
inner join User on Message.User_id = User.id
where Rooms_id = Rooms_id
group by User_id;


call GetUsersInRoom(1);

call createUser("User creado desde Procedure", "7777");

-- deberes--
call Login("Pepito", "Hola");