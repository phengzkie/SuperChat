window.onload = () => {
	document.getElementById('fblogin').onclick = () => {
		window.location.href="https://www.facebook.com/dialog/oauth?client_id=443184979483980&redirect_uri=http://localhost:8007/fbloginresult&response_type=code";
	}
	document.getElementById('twtlogin').onclick = () => {
		window.location.href="http://localhost:8007/auth/twitter";
	}
	document.getElementById('signup').onclick = () => {
		var fn = document.getElementById('fname').value;
		var ln = document.getElementById('lname').value;
		var email = document.getElementById('email').value;
		var un = document.getElementById('uname').value;
		var pw = document.getElementById('pword').value;
		let rq = new XMLHttpRequest();
		rq.onreadystatechange = () => {
			if(rq.readyState == 4) {
				let resData = JSON.parse(rq.responseText);
				alert(resData.status);
				if(resData.status == "Successful") {
					window.location.href = "/";
				}
			}
		}
		rq.open("POST", "/signup", true);
		rq.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		rq.send("firstname="+fn+"&lastname="+ln+"&email="+email+"&username="+un+"&password="+pw);
	}
	var text = 'Sign in';
	var a = document.getElementById('real_btn_login').onclick = popup1 = () => {
		var popup = document.createElement('div');
		popup.className = 'fullscreenpopup';
		var container = document.createElement('div');
		container.className = 'fullscreenpopup_container';
		popup.appendChild(container);
		var content = document.createElement('div');
		content.className = 'fullscreenpopup_content';
		container.appendChild(content);
		var p1 = document.createElement('p');
		p1.appendChild(document.createTextNode(text));
		content.appendChild(p1);
		var p11 = document.createElement('p');
		let input = document.createElement('input');
		input.setAttribute('type', 'text');
		input.setAttribute('placeholder', 'Username');
		input.className = 'txtInputBox';
		var p12 = document.createElement('p');
		let input2 = document.createElement('input');
		input2.setAttribute('type', 'password');
		input.setAttribute('id', 'real_uname');
		input2.setAttribute('id', 'real_pword');
		input2.setAttribute('placeholder', 'Password');
		input2.className = 'txtInputBoxPassword';
		p11.appendChild(input);
		p12.appendChild(input2);
		content.appendChild(p11);
		content.appendChild(p12);
		var p2 = document.createElement('p');
		var p3 = document.createElement('p');
		content.appendChild(p2);
		content.appendChild(p3);
		var button = document.createElement('button');
		button.className = 'button';
		button.onclick = () => {
			var as = input.value;
			var ab = input2.value;
			var aa = isNaN(parseFloat(as));
			if(input.value =='' || input2.value == '') {
				alert('Please enter a missing fields.');
			}
			else if(isNaN(parseFloat(as) && isNaN(parseFloat(ab)))) {
				let unn = as;
				let pww = ab;
				let xhr = new XMLHttpRequest();
				xhr.onreadystatechange = () => {
					if(xhr.readyState == 4) {
						console.log("response eto: " + xhr.responseText);
						let resData = JSON.parse(xhr.responseText);
						console.log(resData.status);
						if(resData.status == "success") {
							window.location.href="/dashboard";
							localStorage.setItem("nickname", resData.username);
							localStorage.setItem("email", resData.email);
							localStorage.setItem("name", resData.name);
							localStorage.setItem("sessionid", resData.id);
						}
						else {
							alert("Incorrect username / password combination..");
						}
					}
				}
				xhr.open("GET", "/login?username="+unn+"&password="+pww, true);
				xhr.send();
			}
			else {
				alert("mali talaga gago");
			}
		}
		p2.appendChild(button);
		var span = document.createElement('span');
		span.appendChild(document.createTextNode('Login'));
		button.appendChild(span);
		var button2 = document.createElement('button');
		button2.className = 'btnCancel';
		button2.onclick = () => {
			document.body.removeChild(popup);
		}
		p2.appendChild(button2);
		var span2 = document.createElement('span');
		span2.appendChild(document.createTextNode('Cancel'));
		button2.appendChild(span2);
		document.body.appendChild(popup);
	}
}
